/** Replaces {{token}} placeholders — unknown tokens are left as-is rather than blanked,
 *  so a typo in the template is visible instead of silently disappearing. */
export function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) =>
    key in context ? context[key] : match,
  );
}

// WhatsApp renders *text* as bold and _text_ as italic, and preserves the
// blank lines below as-is — this is what gives the message its spacing.
export const DEFAULT_MESSAGE_TEMPLATE = `Hi *{{name}}* 👋

Your registration for *{{eventName}}* is confirmed! ✅

📅 Date: {{startDate}}
📍 Location: {{location}}
🎟️ Token No: *{{referenceNumber}}*

_Please keep this token number handy for any follow-up._

Thank you for registering with us!`;
