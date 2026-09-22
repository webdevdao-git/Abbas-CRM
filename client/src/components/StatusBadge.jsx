import { RSVP_STATUS, INVITATION } from '../lib/constants.js';

const MAPS = { rsvp: RSVP_STATUS, invitation: INVITATION };

export default function StatusBadge({ kind = 'rsvp', value, className = '' }) {
  const config = MAPS[kind]?.[value];
  if (!config) return null;
  return <span className={`badge ${config.className} ${className}`}>{config.label}</span>;
}
