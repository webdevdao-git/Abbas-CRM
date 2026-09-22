import { env, isWhatsAppApiConfigured } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';

/**
 * WhatsApp delivery layer.
 *
 * Today every message goes out through click-to-chat: the server renders the
 * text, the browser opens wa.me, and the admin presses send. Nothing is sent
 * automatically and no guest ever visits a link of ours.
 *
 * When WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN are set, `sendMessage`
 * below becomes a real Cloud API call. Controllers already call through this
 * module, so enabling it is a configuration change, not a rewrite.
 */

export const deliveryMode = () => (isWhatsAppApiConfigured ? 'cloud-api' : 'click-to-chat');

/// Builds the wa.me URL the admin's browser opens.
export function buildClickToChatUrl(phone, message) {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Future integration point. Kept deliberately inert until credentials exist so
 * the system can never silently blast messages to real guests.
 */
export async function sendMessage({ phone, message }) {
  if (!isWhatsAppApiConfigured) {
    return {
      delivered: false,
      mode: 'click-to-chat',
      url: buildClickToChatUrl(phone, message),
    };
  }

  const digits = normalizePhone(phone).replace(/\D/g, '');
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${env.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`);
  }

  return { delivered: true, mode: 'cloud-api', payload: await response.json() };
}

/**
 * Future inbound parser: turns a guest's WhatsApp reply into an RSVP update.
 * Already unit-testable; wired to nothing until a webhook exists.
 *
 *   "yes"            -> { status: 'CONFIRMED' }
 *   "coming, 3"      -> { status: 'CONFIRMED', confirmedCount: 3 }
 *   "2 people"       -> { status: 'CONFIRMED', confirmedCount: 2 }
 *   "can't come"     -> { status: 'NOT_ATTENDING', confirmedCount: 0 }
 */
export function parseInboundReply(text) {
  if (!text) return null;
  const normalized = String(text).toLowerCase().trim();

  const negative = /\b(no|not|cant|can't|cannot|unable|sorry|won't|wont|nahi|maaf)\b/.test(normalized);
  const positive = /\b(yes|yeah|yep|sure|ok|okay|coming|attend|attending|inshallah|insha'?allah|jarur|zaroor|aaunga|will be there)\b/.test(normalized);

  const countMatch = normalized.match(/(\d{1,3})\s*(people|person|persons|guests?|pax|members?|log)?/);
  const confirmedCount = countMatch ? Number(countMatch[1]) : undefined;

  if (negative && !positive) {
    return { status: 'NOT_ATTENDING', confirmedCount: 0, rawMessage: text };
  }
  if (positive || confirmedCount !== undefined) {
    return { status: 'CONFIRMED', confirmedCount, rawMessage: text };
  }
  return null;
}
