import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { asyncHandler, badRequest, notFound } from '../utils/errors.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';
import { renderTemplate } from '../utils/templates.js';
import { buildClickToChatUrl } from '../services/whatsappService.js';
import { getActiveEvent } from './eventController.js';

const RSVP_STATUSES = ['PENDING', 'CONFIRMED', 'NOT_ATTENDING'];
const FUNCTION_KEYS = ['ENGAGEMENT', 'DAREES'];

/// Guests always come back with their function invitations attached, so the
/// UI can render either list without a second request.
const WITH_INVITATIONS = {
  invitations: {
    include: { function: true },
    orderBy: { function: { sortOrder: 'asc' } },
  },
};

const phoneField = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .refine(isValidPhone, 'Enter a valid mobile number (7-15 digits, country code optional)')
  .transform(normalizePhone);

/// Which ceremonies a guest is invited to, and for how many people.
const invitationsField = z
  .array(
    z.object({
      functionKey: z.enum(FUNCTION_KEYS),
      invitedCount: z.coerce.number().int().min(1, 'At least 1 person').max(500),
    })
  )
  .min(1, 'Invite the guest to at least one function')
  .refine(
    (list) => new Set(list.map((i) => i.functionKey)).size === list.length,
    'Each function can only be listed once'
  );

// ------------------------------------------------------------- schemas

export const createGuestSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  phone: phoneField,
  familyName: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  invitations: invitationsField,
});

export const updateGuestSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneField.optional(),
  familyName: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  /// Omit to leave invitations untouched; send the full desired set to replace them.
  invitations: invitationsField.optional(),
});

export const rsvpSchema = z.object({
  functionKey: z.enum(FUNCTION_KEYS),
  status: z.enum(RSVP_STATUSES),
  confirmedCount: z.coerce.number().int().min(0).max(500).optional(),
  rawMessage: z.string().trim().max(2000).optional(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  /// ALL shows every guest; a key narrows the list to that ceremony.
  function: z.enum([...FUNCTION_KEYS, 'ALL']).default('ALL'),
  filter: z
    .enum([
      'ALL',
      'CONFIRMED',
      'PENDING',
      'NOT_ATTENDING',
      'INVITATION_SENT',
      'INVITATION_NOT_SENT',
    ])
    .default('ALL'),
  sort: z.enum(['createdAt', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const bulkSchema = z.object({
  guestIds: z.array(z.string().uuid()).min(1, 'Select at least one guest').max(1000),
});

// ------------------------------------------------------------- helpers

function searchClause(search) {
  if (!search) return {};
  const digits = search.replace(/\D/g, '');
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { familyName: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      ...(digits ? [{ phone: { contains: digits } }] : [{ phone: { contains: search } }]),
    ],
  };
}

/// RSVP filters apply to the chosen ceremony; invitation filters are about
/// the WhatsApp message, which is sent once per guest.
function filterClause(filter, functionKey) {
  if (filter === 'INVITATION_SENT') return { invitationStatus: 'SENT' };
  if (filter === 'INVITATION_NOT_SENT') return { invitationStatus: 'NOT_SENT' };
  if (!RSVP_STATUSES.includes(filter)) return {};

  return {
    invitations: {
      some: {
        rsvpStatus: filter,
        ...(functionKey !== 'ALL' ? { function: { key: functionKey } } : {}),
      },
    },
  };
}

function functionScope(functionKey) {
  return functionKey === 'ALL'
    ? {}
    : { invitations: { some: { function: { key: functionKey } } } };
}

async function nextGuestCode(tx) {
  const [{ nextval }] = await tx.$queryRaw`SELECT nextval('guest_code_seq') AS nextval`;
  return `G-${String(nextval).padStart(4, '0')}`;
}

async function findGuestOrThrow(id) {
  const guest = await prisma.guest.findUnique({ where: { id }, include: WITH_INVITATIONS });
  if (!guest) throw notFound('Guest not found.');
  return guest;
}

/// Maps requested function keys to this event's function rows.
function resolveFunctionIds(event, invitations) {
  return invitations.map((invitation) => {
    const fn = event.functions.find((candidate) => candidate.key === invitation.functionKey);
    if (!fn) throw badRequest(`Function ${invitation.functionKey} is not configured.`);
    return { functionId: fn.id, invitedCount: invitation.invitedCount };
  });
}

// ------------------------------------------------------------- handlers

export const listGuests = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const { search, filter, sort, order, page, pageSize } = req.query;
  const functionKey = req.query.function;

  const where = {
    eventId: event.id,
    ...functionScope(functionKey),
    ...filterClause(filter, functionKey),
    ...searchClause(search),
  };

  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: WITH_INVITATIONS,
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.guest.count({ where }),
  ]);

  res.json({
    guests,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

export const getGuest = asyncHandler(async (req, res) => {
  const guest = await prisma.guest.findUnique({
    where: { id: req.params.id },
    include: {
      ...WITH_INVITATIONS,
      rsvpResponses: {
        orderBy: { respondedAt: 'desc' },
        take: 20,
        include: { invitation: { include: { function: true } } },
      },
      invitationLogs: { orderBy: { sentAt: 'desc' }, take: 20 },
    },
  });
  if (!guest) throw notFound('Guest not found.');
  res.json({ guest });
});

export const createGuest = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const { invitations, ...contact } = req.body;
  const rows = resolveFunctionIds(event, invitations);

  const guest = await prisma.$transaction(async (tx) => {
    const code = await nextGuestCode(tx);
    return tx.guest.create({
      data: {
        ...contact,
        code,
        eventId: event.id,
        invitations: { create: rows },
      },
      include: WITH_INVITATIONS,
    });
  });

  res.status(201).json({ guest });
});

export const updateGuest = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const existing = await findGuestOrThrow(req.params.id);
  const { invitations, ...contact } = req.body;

  const guest = await prisma.$transaction(async (tx) => {
    if (invitations) {
      const rows = resolveFunctionIds(event, invitations);
      const keepIds = rows.map((row) => row.functionId);

      // Removing a function deletes that ceremony's RSVP for this guest.
      await tx.guestInvitation.deleteMany({
        where: { guestId: existing.id, functionId: { notIn: keepIds } },
      });

      for (const row of rows) {
        const current = existing.invitations.find((i) => i.functionId === row.functionId);

        if (!current) {
          await tx.guestInvitation.create({
            data: { guestId: existing.id, functionId: row.functionId, invitedCount: row.invitedCount },
          });
        } else {
          await tx.guestInvitation.update({
            where: { id: current.id },
            data: {
              invitedCount: row.invitedCount,
              // Never leave more people confirmed than are now invited.
              confirmedCount: Math.min(current.confirmedCount, row.invitedCount),
            },
          });
        }
      }
    }

    return tx.guest.update({
      where: { id: existing.id },
      data: contact,
      include: WITH_INVITATIONS,
    });
  });

  res.json({ guest });
});

/// The one-tap RSVP buttons. Always scoped to a single ceremony.
export const setRsvp = asyncHandler(async (req, res) => {
  const guest = await findGuestOrThrow(req.params.id);
  const { functionKey, status, rawMessage } = req.body;

  const invitation = guest.invitations.find((i) => i.function.key === functionKey);
  if (!invitation) {
    throw badRequest(`${guest.name} is not invited to this function.`);
  }

  let confirmedCount = req.body.confirmedCount;

  if (status === 'NOT_ATTENDING') {
    confirmedCount = 0;
  } else if (status === 'PENDING') {
    confirmedCount = confirmedCount ?? 0;
  } else if (confirmedCount === undefined) {
    // "Confirmed" with no number given: assume the whole invited party.
    confirmedCount =
      invitation.confirmedCount > 0 ? invitation.confirmedCount : invitation.invitedCount;
  }

  if (confirmedCount > invitation.invitedCount) {
    throw badRequest(`Confirmed people cannot exceed the ${invitation.invitedCount} invited.`, [
      { field: 'confirmedCount', message: `Maximum is ${invitation.invitedCount}` },
    ]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.guestInvitation.update({
      where: { id: invitation.id },
      data: {
        rsvpStatus: status,
        confirmedCount,
        rsvpReceivedAt: status === 'PENDING' ? null : new Date(),
      },
    });

    // Append to the immutable history rather than overwriting it.
    await tx.rsvpResponse.create({
      data: {
        guestId: guest.id,
        invitationId: invitation.id,
        status,
        confirmedCount,
        source: 'MANUAL',
        rawMessage: rawMessage ?? null,
      },
    });

    return tx.guest.findUnique({ where: { id: guest.id }, include: WITH_INVITATIONS });
  });

  res.json({ guest: updated });
});

export const deleteGuest = asyncHandler(async (req, res) => {
  await findGuestOrThrow(req.params.id);
  await prisma.guest.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ------------------------------------------------------------- whatsapp

export const getGuestMessage = asyncHandler(async (req, res) => {
  const key = (req.query.template ?? 'INVITATION').toUpperCase();
  if (!['INVITATION', 'REMINDER', 'CONFIRMATION'].includes(key)) {
    throw badRequest('Unknown message template.');
  }

  const guest = await findGuestOrThrow(req.params.id);
  const { functions, ...event } = await getActiveEvent();

  const template = await prisma.messageTemplate.findUnique({
    where: { eventId_key: { eventId: event.id, key } },
  });
  if (!template) throw notFound('Message template not configured.');

  const message = renderTemplate(template.body, { guest, event, functions });

  res.json({
    message,
    templateKey: key,
    phone: guest.phone,
    whatsappUrl: buildClickToChatUrl(guest.phone, message),
  });
});

export const logInvitationSent = asyncHandler(async (req, res) => {
  const guest = await findGuestOrThrow(req.params.id);
  const key = (req.body.templateKey ?? 'INVITATION').toUpperCase();
  const message = req.body.message ?? '';
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invitationLog.create({
      data: {
        guestId: guest.id,
        templateKey: key,
        channel: 'CLICK_TO_CHAT',
        messageSnapshot: message,
        sentAt: now,
      },
    });

    return tx.guest.update({
      where: { id: guest.id },
      data:
        key === 'REMINDER'
          ? { lastReminderAt: now }
          : {
              invitationStatus: 'SENT',
              invitationSentAt: guest.invitationSentAt ?? now,
            },
      include: WITH_INVITATIONS,
    });
  });

  res.json({ guest: updated });
});

// ------------------------------------------------------------- bulk ops

export const bulkMarkInvitationSent = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const result = await prisma.guest.updateMany({
    where: { id: { in: req.body.guestIds }, eventId: event.id },
    data: { invitationStatus: 'SENT', invitationSentAt: new Date() },
  });
  res.json({ updated: result.count });
});

export const bulkDelete = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const result = await prisma.guest.deleteMany({
    where: { id: { in: req.body.guestIds }, eventId: event.id },
  });
  res.json({ deleted: result.count });
});

// ------------------------------------------------------------- csv export

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/// One row per guest, with a column pair per ceremony so both lists are
/// readable in a single spreadsheet.
export const exportCsv = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const ids = req.query.ids ? String(req.query.ids).split(',').filter(Boolean) : null;
  const functionKey = (req.query.function ?? 'ALL').toUpperCase();

  const guests = await prisma.guest.findMany({
    where: {
      eventId: event.id,
      ...(ids ? { id: { in: ids } } : {}),
      ...functionScope(FUNCTION_KEYS.includes(functionKey) ? functionKey : 'ALL'),
    },
    include: WITH_INVITATIONS,
    orderBy: { code: 'asc' },
  });

  const header = [
    'Guest ID', 'Full Name', 'Mobile Number', 'Family / Group',
    ...event.functions.flatMap((fn) => [
      `${fn.name} - Invited`, `${fn.name} - Confirmed`, `${fn.name} - RSVP`,
    ]),
    'Invitation', 'Invitation Sent Date', 'Notes', 'Added On',
  ];

  const rows = guests.map((guest) => {
    const cells = [guest.code, guest.name, guest.phone, guest.familyName];

    for (const fn of event.functions) {
      const invitation = guest.invitations.find((i) => i.functionId === fn.id);
      cells.push(
        invitation ? invitation.invitedCount : '',
        invitation ? invitation.confirmedCount : '',
        invitation ? invitation.rsvpStatus : 'NOT INVITED'
      );
    }

    cells.push(guest.invitationStatus, guest.invitationSentAt, guest.notes, guest.createdAt);
    return cells.map(csvCell).join(',');
  });

  const filename = `guests-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`﻿${[header.map(csvCell).join(','), ...rows].join('\n')}`);
});
