export type EventFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'
  | 'textarea'
  | 'item_list';

export const CHOICE_FIELD_TYPES: EventFieldType[] = ['dropdown', 'radio', 'checkbox'];

/** Field types whose `options` array is required at all — choice fields plus item_list. */
export const OPTIONS_REQUIRED_FIELD_TYPES: EventFieldType[] = [...CHOICE_FIELD_TYPES, 'item_list'];

export interface EventFormFieldRecord {
  id: string;
  event_id: string;
  label: string;
  field_type: EventFieldType;
  options: string[] | null;
  is_required: boolean;
  order: number;
}

export interface CreateEventFieldInput {
  label: string;
  fieldType: EventFieldType;
  options?: string[];
  isRequired?: boolean;
}

/** Value shape submitted per field — string for most types, string[] for checkbox,
 *  Record<itemLabel, value> for item_list. */
export type EventFieldValue = string | string[] | Record<string, string>;
