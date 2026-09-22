import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/errors.js';
import { getActiveEvent } from './eventController.js';

const EMPTY = () => ({
  totalGuests: 0,
  confirmedGuests: 0,
  pendingGuests: 0,
  notAttendingGuests: 0,
  totalInvitedPeople: 0,
  expectedPeople: 0,
  checkedIn: 0,
  responseRate: 0,
});

/**
 * Dashboard numbers, per ceremony.
 *
 * Deliberately three queries, not one per function per metric: serverless runs
 * against a pooled connection (connection_limit=1), so a fan-out of a dozen
 * concurrent queries queues up behind one connection and trips Prisma's pool
 * timeout. Grouping in SQL keeps this to a fixed, tiny number of round trips
 * however many functions the event grows to have.
 *
 * Expected people is the SUM of confirmed headcounts for that function, not
 * the number of guests who said yes.
 */
export const getStats = asyncHandler(async (_req, res) => {
  const { functions, ...event } = await getActiveEvent();
  const functionIds = functions.map((fn) => fn.id);

  const [byStatus, checkedInRows, guestsByInvitation] = await Promise.all([
    prisma.guestInvitation.groupBy({
      by: ['functionId', 'rsvpStatus'],
      where: { functionId: { in: functionIds } },
      _count: { _all: true },
      _sum: { invitedCount: true, confirmedCount: true },
    }),
    prisma.guestInvitation.groupBy({
      by: ['functionId'],
      where: { functionId: { in: functionIds }, checkedInAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.guest.groupBy({
      by: ['invitationStatus'],
      where: { eventId: event.id },
      _count: { _all: true },
    }),
  ]);

  const functionStats = functions.map((fn) => {
    const rows = byStatus.filter((row) => row.functionId === fn.id);
    const stats = EMPTY();

    for (const row of rows) {
      const guests = row._count._all;
      stats.totalGuests += guests;
      stats.totalInvitedPeople += row._sum.invitedCount ?? 0;

      if (row.rsvpStatus === 'CONFIRMED') {
        stats.confirmedGuests = guests;
        stats.expectedPeople = row._sum.confirmedCount ?? 0;
      } else if (row.rsvpStatus === 'PENDING') {
        stats.pendingGuests = guests;
      } else if (row.rsvpStatus === 'NOT_ATTENDING') {
        stats.notAttendingGuests = guests;
      }
    }

    stats.checkedIn =
      checkedInRows.find((row) => row.functionId === fn.id)?._count._all ?? 0;

    const responded = stats.confirmedGuests + stats.notAttendingGuests;
    stats.responseRate = stats.totalGuests
      ? Math.round((responded / stats.totalGuests) * 100)
      : 0;

    return { key: fn.key, name: fn.name, time: fn.time, venue: fn.venue, stats };
  });

  const countOf = (status) =>
    guestsByInvitation.find((row) => row.invitationStatus === status)?._count._all ?? 0;

  const invitationSent = countOf('SENT');
  const invitationNotSent = countOf('NOT_SENT');

  res.json({
    event,
    functions: functionStats,
    // Contact-level totals: one person counts once even if invited to both.
    overall: {
      totalContacts: invitationSent + invitationNotSent,
      invitationSent,
      invitationNotSent,
    },
  });
});
