/// Renders {{placeholders}} in a message template for one guest.
///
/// The function placeholders only ever mention the ceremonies THIS guest is
/// invited to, so a DAREES-only guest is never told about the engagement.
export function renderTemplate(body, { guest = {}, event = {}, functions = [] } = {}) {
  const eventDate = event.date
    ? new Date(event.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  // The functions this guest is actually invited to, in display order.
  const invited = (guest.invitations ?? [])
    .map((invitation) => invitation.function)
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const timeOf = (key) => functions.find((fn) => fn.key === key)?.time ?? '';

  const functionDetails = invited
    .map((fn) => (fn.time ? `${fn.name} - ${fn.time}` : fn.name))
    .join('\n');

  const names = invited.map((fn) => fn.name);
  const functionNames =
    names.length <= 1
      ? names.join('')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  const values = {
    guestName: guest.name ?? '',
    familyName: guest.familyName ?? '',
    phone: guest.phone ?? '',
    eventName: event.name ?? '',
    eventDate,
    venue: event.venue ?? '',
    hostName: event.hostName ?? '',
    functionDetails,
    functionNames,
    engagementTime: timeOf('ENGAGEMENT'),
    dareesTime: timeOf('DAREES'),
  };

  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}

export const TEMPLATE_PLACEHOLDERS = [
  'guestName',
  'familyName',
  'eventName',
  'eventDate',
  'functionDetails',
  'functionNames',
  'engagementTime',
  'dareesTime',
  'venue',
  'hostName',
];
