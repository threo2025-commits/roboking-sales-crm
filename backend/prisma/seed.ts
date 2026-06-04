import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  throw new Error('Production seed is blocked. Set ALLOW_PRODUCTION_SEED=true only for the first controlled bootstrap, then change all default passwords.');
}

async function upsertUser(name: string, loginId: string, email: string, role: Role, managerId?: string) {
  const passwordHash = await bcrypt.hash('ChangeMe@123', 10);
  return prisma.user.upsert({
    where: { loginId },
    update: { name, role, email, emailAddress: email, managerId },
    create: { name, loginId, email, role, passwordHash, emailAddress: email, managerId, mustChangePassword: true }
  });
}

async function main() {
  const owner = await upsertUser('RoboKing Owner', 'owner', 'owner@roboking.in', 'OWNER');
  const manager = await upsertUser('Sales Manager', 'manager', 'manager@roboking.in', 'MANAGER', owner.id);
  const pa = await upsertUser('Admin PA', 'pa', 'pa@roboking.in', 'PA_ADMIN_ASSISTANT', owner.id);
  const employee = await upsertUser('Sales Employee', 'employee', 'employee@roboking.in', 'EMPLOYEE', manager.id);

  await prisma.setting.upsert({ where: { key: 'ADMIN_BCC_EMAIL' }, update: {}, create: { key: 'ADMIN_BCC_EMAIL', value: 'update_later@roboking.in' } });
  await prisma.setting.upsert({ where: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT' }, update: {}, create: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT', value: 'false' } });

  const lead = await prisma.lead.upsert({
    where: { id: 'seed-lead-dps' },
    update: {},
    create: {
      id: 'seed-lead-dps', title: 'Delhi Public School STEM Lab', organization: 'Delhi Public School', contactName: 'Mr. Sharma', phone: '+919876543210', whatsapp: '+919876543210', email: 'principal@example.com', city: 'Delhi', state: 'Delhi', requirement: 'STEM robotics lab setup and robotics kits', source: 'Seed Data', status: 'CONTACTED', priority: 'HIGH', expectedValue: 250000, createdById: owner.id, assignedToId: employee.id, nextFollowupAt: new Date(Date.now() + 1000 * 60 * 60 * 4)
    }
  });

  await prisma.deal.upsert({ where: { id: 'seed-deal-dps' }, update: {}, create: { id: 'seed-deal-dps', leadId: lead.id, title: 'DPS STEM Lab Proposal', stage: 'CONTACTED', expectedValue: 250000, probability: 30, assignedToId: employee.id, nextFollowupAt: new Date(Date.now() + 1000 * 60 * 60 * 4) } });

  await prisma.followup.upsert({
    where: { id: 'seed-followup-dps' },
    update: {},
    create: { id: 'seed-followup-dps', leadId: lead.id, assignedToId: employee.id, title: 'Call DPS for lab requirement confirmation', dueAt: new Date(Date.now() + 1000 * 60 * 60 * 4), notes: 'Ask budget and product interest' }
  });

  await prisma.task.upsert({
    where: { id: 'seed-task-dps-catalogue' },
    update: {},
    create: { id: 'seed-task-dps-catalogue', title: 'Prepare robotics kit catalogue for DPS', description: 'Send brochure after call', assignedToId: employee.id, createdById: pa.id, priority: 'HIGH', leadId: lead.id, dueAt: new Date(Date.now() + 1000 * 60 * 60 * 6) }
  });
  await prisma.task.upsert({
    where: { id: 'seed-task-pa-followups' },
    update: {},
    create: { id: 'seed-task-pa-followups', title: 'Check pending follow-ups', description: 'PA reminder task for today', assignedToId: pa.id, createdById: owner.id, priority: 'MEDIUM', dueAt: new Date(Date.now() + 1000 * 60 * 60 * 2) }
  });

  const templates = [
    { name: 'First Introduction', subject: 'RoboKing STEM & Robotics Solutions for {{organization_name}}', bodyHtml: '<p>Dear {{contact_person}},</p><p>This is {{employee_name}} from RoboKing. We provide STEM, robotics kits, lab setup and training solutions for institutions.</p><p>Regards,<br/>{{employee_name}}<br/>RoboKing</p>' },
    { name: 'Follow-up After Call', subject: 'Follow-up from RoboKing - {{organization_name}}', bodyHtml: '<p>Dear {{contact_person}},</p><p>Thank you for your time today. As discussed, I am sharing the next details for your robotics/STEM requirement.</p><p>Regards,<br/>{{employee_name}}<br/>RoboKing</p>' },
    { name: 'Quotation Sent', subject: 'Quotation for {{organization_name}} - RoboKing', bodyHtml: '<p>Dear {{contact_person}},</p><p>Please find attached the quotation/proposal for your requirement.</p><p>Regards,<br/>{{employee_name}}<br/>RoboKing</p>' }
  ];
  for (const t of templates) await prisma.emailTemplate.upsert({ where: { name: t.name }, update: { subject: t.subject, bodyHtml: t.bodyHtml, isActive: true }, create: t });

  await prisma.whatsappTemplate.createMany({ data: [
    { name: 'Intro WhatsApp', message: 'Hello {{contact_person}}, this is {{employee_name}} from RoboKing. We provide STEM and Robotics solutions. May I share details?' },
    { name: 'Follow-up WhatsApp', message: 'Hello {{contact_person}}, following up regarding your RoboKing robotics/STEM requirement for {{organization_name}}.' }
  ], skipDuplicates: true });
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
