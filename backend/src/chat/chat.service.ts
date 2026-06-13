import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private isUnrestricted(user: { role: string }) {
    return ['OWNER', 'MANAGER'].includes(user.role);
  }

  private async employeeDirectChatAllowed() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT' } });
    return setting?.value === 'true';
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

  async createGroup(title: string, createdById: string, memberIds: string[], linkedLeadId?: string, linkedDealId?: string) {
    const conversation = await this.prisma.chatConversation.create({ data: { title, isGroup: true, createdById, linkedLeadId, linkedDealId } });
    await this.prisma.chatMember.createMany({
      data: Array.from(new Set([createdById, ...memberIds])).map((userId) => ({
        conversationId: conversation.id,
        userId,
        lastReadAt: userId === createdById ? new Date() : undefined
      })),
      skipDuplicates: true
    });
    return conversation;
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
