/** events-registration-module.md §3.2 */
export enum EventFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  EMAIL = 'email',
  DROPDOWN = 'dropdown',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  FILE = 'file',
  TEXTAREA = 'textarea',
  /** Admin defines a list of items (via `options`); the responder enters a
   *  value against each one — e.g. "quantity needed" per relief item. */
  ITEM_LIST = 'item_list',
}

/** Field types that need an `options` list (dropdown/radio/checkbox). */
export const CHOICE_FIELD_TYPES = [
  EventFieldType.DROPDOWN,
  EventFieldType.RADIO,
  EventFieldType.CHECKBOX,
];

/** Field types whose `options` array is required at all — choice fields plus item_list. */
export const OPTIONS_REQUIRED_FIELD_TYPES = [...CHOICE_FIELD_TYPES, EventFieldType.ITEM_LIST];
