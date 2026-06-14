import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private readonly categories = new Set(['TEAM', 'SALES', 'CLIENT_HANDLING', 'PROJECT', 'LEAD_DISCUSSION']);

  private isUnrestricted(user: { role: string }) {
    return ['OWNER', 'MANAGER'].includes(user.role);
  }

  private async employeeDirectChatAllowed() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT' } });
    return setting?.value === 'true';
  }

  private normalizeCategory(category?: string) {
    const normalized = category?.trim().toUpperCase() || 'TEAM';
    if (!this.categories.has(normalized)) throw new BadRequestException('Invalid chat group category');
    return normalized;
  }

  private async group(conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });
    if (!conversation || !conversation.isGroup) throw new NotFoundException('Chat group not found');
    return conversation;
  }

  private async auditGroup(actorId: string, action: string, conversationId: string, metadata?: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: { actorId, action, entity: 'ChatConversation', entityId: conversationId, metadata: metadata as any }
    });
  }

  async conversations(user: { sub: string; role: string }) {
    const unrestricted = this.isUnrestricted(user);
    const conversations = await this.prisma.chatConversation.findMany({
      where: unrestricted ? {} : { members: { some: { userId: user.sub } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, loginId: true, role: true } } } },
        messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    return Promise.all(conversations.map(async (conversation) => {
      const membership = conversation.members.find((member) => member.userId === user.sub);
      const unreadCount = membership
        ? await this.prisma.chatMessage.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: user.sub },
              ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {})
            }
          })
        : 0;
      return { ...conversation, unreadCount };
    }));
  }

  async assertCanAccessConversation(conversationId: string, user: { sub: string; role: string }) {
    const conversation = await this.prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Chat conversation not found');
    if (this.isUnrestricted(user)) return conversation;
    const member = await this.prisma.chatMember.findUnique({ where: { conversationId_userId: { conversationId, userId: user.sub } } });
    if (!member) throw new ForbiddenException('You are not a member of this chat');
    return conversation;
  }

  async messages(conversationId: string, user: { sub: string; role: string }) {
    await this.assertCanAccessConversation(conversationId, user);
    const [messages, members] = await Promise.all([
      this.prisma.chatMessage.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, loginId: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: 300
      }),
      this.prisma.chatMember.findMany({
        where: { conversationId },
        select: { userId: true, lastReadAt: true, user: { select: { id: true, name: true } } }
      })
    ]);
    return messages.map((message) => ({
      ...message,
      seenBy: members
        .filter((member) => member.userId !== message.senderId && member.lastReadAt && member.lastReadAt >= message.createdAt)
        .map((member) => member.user)
    }));
  }

  async markRead(conversationId: string, user: { sub: string; role: string }) {
    await this.assertCanAccessConversation(conversationId, user);
    const member = await this.prisma.chatMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.sub } }
    });
    if (!member) return { ok: true };
    await this.prisma.chatMember.update({ where: { id: member.id }, data: { lastReadAt: new Date() } });
    return { ok: true };
  }

  async createGroup(title: string, createdById: string, memberIds: string[], linkedLeadId?: string, linkedDealId?: string, category?: string) {
    const cleanTitle = title?.trim();
    if (!cleanTitle) throw new BadRequestException('Group name is required');
    const conversation = await this.prisma.chatConversation.create({
      data: {
        title: cleanTitle,
        isGroup: true,
        category: this.normalizeCategory(category),
        ownerId: createdById,
        createdById,
        linkedLeadId,
        linkedDealId
      }
    });
    await this.prisma.chatMember.createMany({
      data: Array.from(new Set([createdById, ...memberIds])).map((userId) => ({
        conversationId: conversation.id,
        userId,
        lastReadAt: userId === createdById ? new Date() : undefined
      })),
      skipDuplicates: true
    });
    await this.auditGroup(createdById, 'CREATE_CHAT_GROUP', conversation.id, { title: cleanTitle, category: conversation.category });
    return conversation;
  }

  async updateGroup(conversationId: string, body: { title?: string; category?: string; ownerId?: string }, user: { sub: string }) {
    const conversation = await this.group(conversationId);
    const data: { title?: string; category?: string; ownerId?: string } = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) throw new BadRequestException('Group name is required');
      data.title = title;
    }
    if (body.category !== undefined) data.category = this.normalizeCategory(body.category);
    if (body.ownerId !== undefined) {
      const owner = conversation.members.find((member) => member.userId === body.ownerId);
      if (!owner) throw new BadRequestException('New group owner must already be a member');
      data.ownerId = body.ownerId;
    }
    const updated = await this.prisma.chatConversation.update({ where: { id: conversationId }, data });
    await this.auditGroup(user.sub, 'UPDATE_CHAT_GROUP', conversationId, data);
    return updated;
  }

  async addMembers(conversationId: string, memberIds: string[], user: { sub: string }) {
    await this.group(conversationId);
    const uniqueIds = Array.from(new Set(memberIds || []));
    if (!uniqueIds.length) throw new BadRequestException('Select at least one team member');
    const activeUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, status: 'ACTIVE' },
      select: { id: true }
    });
    await this.prisma.chatMember.createMany({
      data: activeUsers.map(({ id }) => ({ conversationId, userId: id })),
      skipDuplicates: true
    });
    await this.auditGroup(user.sub, 'ADD_CHAT_GROUP_MEMBERS', conversationId, { memberIds: activeUsers.map(({ id }) => id) });
    return { ok: true, added: activeUsers.length };
  }

  async removeMember(conversationId: string, memberId: string, user: { sub: string }) {
    const conversation = await this.group(conversationId);
    const ownerId = conversation.ownerId || conversation.createdById;
    if (memberId === ownerId) throw new BadRequestException('Transfer group ownership before removing the owner');
    await this.prisma.chatMember.deleteMany({ where: { conversationId, userId: memberId } });
    await this.auditGroup(user.sub, 'REMOVE_CHAT_GROUP_MEMBER', conversationId, { memberId });
    return { ok: true };
  }

  async deleteGroup(conversationId: string, user: { sub: string }) {
    const conversation = await this.group(conversationId);
    await this.auditGroup(user.sub, 'DELETE_CHAT_GROUP', conversationId, { title: conversation.title });
    await this.prisma.chatConversation.delete({ where: { id: conversationId } });
    return { ok: true };
  }

  async createDirect(memberId: string, user: { sub: string; role: string }) {
    if (!memberId || memberId === user.sub) throw new BadRequestException('Select another user to start a direct chat');
    if (user.role === 'EMPLOYEE' && !(await this.employeeDirectChatAllowed())) {
      throw new ForbiddenException('Employee direct chat is disabled by admin');
    }

    const otherUser = await this.prisma.user.findUnique({ where: { id: memberId }, select: { id: true, name: true, status: true } });
    if (!otherUser || otherUser.status !== 'ACTIVE') throw new NotFoundException('User not found');

    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: user.sub } } },
          { members: { some: { userId: memberId } } }
        ]
      },
      include: { members: true }
    });
    if (existing && existing.members.length === 2) return existing;

    const conversation = await this.prisma.chatConversation.create({ data: { title: null, isGroup: false, createdById: user.sub } });
    await this.prisma.chatMember.createMany({
      data: [user.sub, memberId].map((userId) => ({
        conversationId: conversation.id,
        userId,
        lastReadAt: userId === user.sub ? new Date() : undefined
      })),
      skipDuplicates: true
    });
    return conversation;
  }

  async sendMessage(conversationId: string, senderId: string, body: string, role = 'EMPLOYEE') {
    await this.assertCanAccessConversation(conversationId, { sub: senderId, role });
    const message = await this.prisma.chatMessage.create({ data: { conversationId, senderId, body } });
    await this.prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return message;
  }
}
