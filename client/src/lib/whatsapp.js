import { api } from './api.js';

/**
 * Opens WhatsApp with a pre-filled message for one guest, then records the
 * send. Nothing is ever sent automatically — the admin presses send inside
 * WhatsApp, and the guest only has to reply with a word.
 *
 * The window is opened synchronously BEFORE the await, otherwise mobile
 * Safari treats it as a popup and blocks it.
 */
export async function sendWhatsApp(guest, templateKey = 'INVITATION') {
  const tab = window.open('', '_blank');

  try {
    const { message, whatsappUrl } = await api.getMessage(guest.id, templateKey);

    if (tab) tab.location.href = whatsappUrl;
    else window.location.href = whatsappUrl;

    // Fire-and-forget: the log must not block the admin's flow.
    const updated = await api.logInvitation(guest.id, { templateKey, message });
    return updated.guest;
  } catch (error) {
    tab?.close();
    throw error;
  }
}
