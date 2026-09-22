import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/errors.js';
import { getActiveEvent } from './eventController.js';

/// Per-ceremony numbers. Engagement and DAREES have separate guest lists, so
/// each gets its own headcount; expected people is always the SUM of confirmed
/// headcounts for that function, not the number of guests.
async function statsForFunction(fn) {
  const scope = { functionId: fn.id };

  const [byStatus, totals, confirmedAgg, checkedIn] = await Promise.all([
    prisma.guestInvitation.groupBy({
      by: ['rsvpStatus'],
      where: scope,
      _count: { _all: true },
    }),
    prisma.guestInvitation.aggregate({ where: scope, _sum: { invitedCount: true } }),
    prisma.guestInvitation.aggregate({
      where: { ...scope, rsvpStatus: 'CONFIRMED' },
      _sum: { confirmedCount: true },
    }),
    prisma.guestInvitation.count({ where: { ...scope, checkedInAt: { not: null } } }),
  ]);

  const count = (status) => byStatus.find((row) => row.rsvpStatus === status)?._count._all ?? 0;

  const confirmedGuests = count('CONFIRMED');
  const pendingGuests = count('PENDING');
  const notAttendingGuests = count('NOT_ATTENDING');
  const totalGuests = confirmedGuests + pendingGuests + notAttendingGuests;

  return {
    key: fn.key,
    name: fn.name,
    time: fn.time,
    venue: fn.venue,
    stats: {
      totalGuests,
      confirmedGuests,
      pendingGuests,
      notAttendingGuests,
      totalInvitedPeople: totals._sum.invitedCount ?? 0,
      expectedPeople: confirmedAgg._sum.confirmedCount ?? 0,
      checkedIn,
      responseRate: totalGuests
        ? Math.round(((confirmedGuests + notAttendingGuests) / totalGuests) * 100)
        : 0,
    },
  };
}

export const getStats = asyncHandler(async (_req, res) => {
  const { functions, ...event } = await getActiveEvent();

  const [functionStats, totalContacts, invitationSent] = await Promise.all([
    Promise.all(functions.map(statsForFunction)),
    prisma.guest.count({ where: { eventId: event.id } }),
    prisma.guest.count({ where: { eventId: event.id, invitationStatus: 'SENT' } }),
  ]);

  res.json({
    event,
    functions: functionStats,
    // Contact-level totals: one person counts once even if invited to both.
    overall: {
      totalContacts,
      invitationSent,
      invitationNotSent: totalContacts - invitationSent,
    },
  });
});
