import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const EVENT = {
  name: "Abbas's Engagement Ceremony",
  date: new Date('2026-10-25T00:00:00.000Z'),
  venue: '',
  hostName: 'Abbas',
  description: 'Engagement ceremony in the morning, followed by DAREES after Zohar Namaz.',
};

/// Engagement and DAREES are separate functions with separate guest lists.
const FUNCTIONS = [
  { key: 'ENGAGEMENT', name: 'Engagement Ceremony', time: '10:00 AM', sortOrder: 1 },
  { key: 'DAREES', name: 'DAREES', time: '1:15 PM (After Zohar Namaz)', sortOrder: 2 },
];

// {{functionDetails}} lists only the functions each guest is invited to, so a
// DAREES-only guest is never told about the engagement.
const TEMPLATES = [
  {
    key: 'INVITATION',
    name: 'Invitation',
    body: `Assalamu Alaikum {{guestName}},

You are warmly invited to {{eventName}} on {{eventDate}}.

{{functionDetails}}

Please confirm your attendance by replying:
YES - if you will attend
NO - if you cannot attend

We would be delighted to have you with us. ❤️`,
  },
  {
    key: 'REMINDER',
    name: 'Reminder',
    body: `Assalamu Alaikum {{guestName}},

Just a gentle reminder regarding {{eventName}} on {{eventDate}}.

{{functionDetails}}

Kindly confirm your attendance whenever convenient.

Thank you ❤️`,
  },
  {
    key: 'CONFIRMATION',
    name: 'Confirmation / Thank you',
    body: `Assalamu Alaikum {{guestName}},

JazakAllah Khair for confirming.

{{eventName}} - {{eventDate}}
{{functionDetails}}

We look forward to seeing you. ❤️`,
  },
];

// Sample data only. Note how the two lists differ: some guests are invited to
// the engagement only, some to DAREES only, some to both.
const SAMPLE_GUESTS = [
  { name: 'Ahmed Khan', phone: '+919876543210', familyName: 'Khan Family', invitationStatus: 'SENT',
    invitations: [{ key: 'ENGAGEMENT', invitedCount: 5, confirmedCount: 4, rsvpStatus: 'CONFIRMED' },
                  { key: 'DAREES', invitedCount: 5, confirmedCount: 4, rsvpStatus: 'CONFIRMED' }] },
  { name: 'Mohammed Ali', phone: '+919876543211', familyName: 'Ali Family', invitationStatus: 'SENT',
    invitations: [{ key: 'ENGAGEMENT', invitedCount: 3 }] },
  { name: 'Yusuf Patel', phone: '+919876543212', familyName: 'Patel Family', invitationStatus: 'SENT',
    invitations: [{ key: 'DAREES', invitedCount: 6, confirmedCount: 6, rsvpStatus: 'CONFIRMED' }] },
  { name: 'Fatima Sheikh', phone: '+919876543213', familyName: 'Sheikh Family', invitationStatus: 'SENT',
    invitations: [{ key: 'ENGAGEMENT', invitedCount: 4, confirmedCount: 2, rsvpStatus: 'CONFIRMED' }] },
  { name: 'Imran Qureshi', phone: '+919876543214', familyName: 'Qureshi Family', invitationStatus: 'SENT',
    invitations: [{ key: 'ENGAGEMENT', invitedCount: 2, rsvpStatus: 'NOT_ATTENDING' },
                  { key: 'DAREES', invitedCount: 2, rsvpStatus: 'NOT_ATTENDING' }] },
  { name: 'Zainab Merchant', phone: '+919876543215', familyName: 'Merchant Family', invitationStatus: 'NOT_SENT',
    invitations: [{ key: 'DAREES', invitedCount: 4 }] },
];

async function nextCode() {
  const [{ nextval }] = await prisma.$queryRaw`SELECT nextval('guest_code_seq') AS nextval`;
  return `G-${String(nextval).padStart(4, '0')}`;
}

async function main() {
  // ----- admin -------------------------------------------------------
  const username = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD is not set. Add it to server/.env before seeding.');
  }

  await prisma.admin.upsert({
    where: { username },
    update: { passwordHash: await bcrypt.hash(password, 10) },
    create: { username, passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`✓ Admin ready: ${username}`);

  // ----- event -------------------------------------------------------
  let event = await prisma.event.findFirst({ where: { isActive: true } });
  event = event
    ? await prisma.event.update({ where: { id: event.id }, data: EVENT })
    : await prisma.event.create({ data: { ...EVENT, isActive: true } });
  console.log(`✓ Event ready: ${event.name}`);

  // ----- functions ---------------------------------------------------
  for (const fn of FUNCTIONS) {
    await prisma.eventFunction.upsert({
      where: { eventId_key: { eventId: event.id, key: fn.key } },
      update: {},              // never clobber times the admin has edited
      create: { ...fn, eventId: event.id },
    });
  }
  const functions = await prisma.eventFunction.findMany({ where: { eventId: event.id } });
  console.log(`✓ Functions ready: ${functions.map((f) => f.name).join(', ')}`);

  // ----- templates ---------------------------------------------------
  for (const template of TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: { eventId_key: { eventId: event.id, key: template.key } },
      update: {},              // never clobber wording the admin has edited
      create: { ...template, eventId: event.id },
    });
  }
  console.log(`✓ Message templates ready: ${TEMPLATES.length}`);

  // ----- sample guests -----------------------------------------------
  const existing = await prisma.guest.count({ where: { eventId: event.id } });
  if (existing > 0) {
    console.log(`• ${existing} guests already present — sample guests skipped.`);
    return;
  }

  const functionId = (key) => functions.find((f) => f.key === key).id;
  const now = new Date();

  for (const { invitations, ...contact } of SAMPLE_GUESTS) {
    await prisma.guest.create({
      data: {
        ...contact,
        code: await nextCode(),
        eventId: event.id,
        invitationSentAt: contact.invitationStatus === 'SENT' ? now : null,
        invitations: {
          create: invitations.map((invitation) => ({
            functionId: functionId(invitation.key),
            invitedCount: invitation.invitedCount,
            confirmedCount: invitation.confirmedCount ?? 0,
            rsvpStatus: invitation.rsvpStatus ?? 'PENDING',
            rsvpReceivedAt: invitation.rsvpStatus && invitation.rsvpStatus !== 'PENDING' ? now : null,
          })),
        },
      },
    });
  }
  console.log(`✓ Seeded ${SAMPLE_GUESTS.length} sample guests`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
