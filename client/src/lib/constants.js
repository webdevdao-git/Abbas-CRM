export const RSVP_STATUS = {
  PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  NOT_ATTENDING: { label: 'Not Attending', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
};

export const INVITATION = {
  NOT_SENT: { label: 'Not sent', className: 'bg-ink-100 text-ink-600' },
  SENT: { label: 'Sent', className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
};

/// Colour per ceremony, so the two lists stay visually distinct.
export const FUNCTION_STYLE = {
  ENGAGEMENT: { short: 'Engagement', chip: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  DAREES: { short: 'DAREES', chip: 'bg-gold-100 text-gold-800 ring-1 ring-gold-200' },
};

export const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NOT_ATTENDING', label: 'Not attending' },
  { value: 'INVITATION_SENT', label: 'Invitation sent' },
  { value: 'INVITATION_NOT_SENT', label: 'Invitation not sent' },
];

/// Finds a guest's invitation for one ceremony, or undefined if not invited.
export const invitationFor = (guest, functionKey) =>
  guest?.invitations?.find((invitation) => invitation.function.key === functionKey);
