import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ImapService {
  constructor(private prisma: PrismaService) {}

  async syncUserInbox(userId: string) {
    const account = await this.prisma.emailAccount.findUnique({ where: { userId } });
    if (!account || !account.imapEnabled) return { synced: 0, skipped: true };

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: true,
      auth: { user: account.emailAddress, pass: Buffer.from(account.encryptedPass, 'base64').toString('utf8') }
    });

    let synced = 0;
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch('1:*', { envelope: true, source: false, uid: true }, { uid: false })) {
        const providerMsgId = String(msg.uid);
        const exists = await this.prisma.emailMessage.findFirst({ where: { providerMsgId, direction: 'INBOUND', toEmail: account.emailAddress } });
        if (exists) continue;
        const envelope = msg.envelope;
        const from = envelope?.from?.[0]?.address || 'unknown';
        const subject = envelope?.subject || '(no subject)';
        const matchedLead = await this.prisma.lead.findFirst({
          where: {
            AND: [
              { OR: [{ email: from }, { email: from.toLowerCase() }] },
              { OR: [{ assignedToId: userId }, { createdById: userId }] }
            ]
          }
        });
        await this.prisma.emailMessage.create({
          data: {
            leadId: matchedLead?.id,
            fromEmail: from,
            toEmail: account.emailAddress,
            subject,
            direction: 'INBOUND',
            providerMsgId,
            receivedAt: envelope?.date || new Date()
          }
        });
        if (matchedLead) {
          await this.prisma.activity.create({ data: { type: 'EMAIL', summary: `Email reply received: ${subject}`, userId, leadId: matchedLead.id, details: from } });
        }
        synced++;
      }
    } finally {
      lock.release();
      await client.logout();
    }
    await this.prisma.emailAccount.update({ where: { userId }, data: { lastSyncedAt: new Date() } });
    return { synced };
  }
}
