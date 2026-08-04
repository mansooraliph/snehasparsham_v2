/** Replaces {{token}} placeholders — unknown tokens are left as-is rather than blanked,
 *  so a typo in the template is visible instead of silently disappearing. */
export function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) =>
    key in context ? context[key] : match,
  );
}

export const DEFAULT_MESSAGE_TEMPLATE =
  'Hi {{name}}, this is a confirmation for "{{eventName}}" on {{startDate}} at {{location}}. Your reference number is {{referenceNumber}}.';
