/** Builds a wa.me deep link — no WhatsApp Business API/credentials needed.
 *  With a phone number it opens a chat with that contact prefilled; without
 *  one, it opens WhatsApp's own contact/share picker with the text ready. */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const digits = phone?.replace(/[^\d]/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
