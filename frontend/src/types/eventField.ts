import type { ResponseStatusTone } from './responseStatus';

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

/** Per-item auto serial number config on an item_list field's `options[i]`.
 *  `next` is the server-managed cursor — read-only from the admin's perspective. */
export interface ItemSerialConfig {
  enabled: boolean;
  prefix: string;
  start: number;
  next: number;
}

export interface ItemSerialConfigInput {
  enabled: boolean;
  prefix?: string;
  start?: number;
}

/** item_list entry — `codes` is assigned by the server once the item has auto
 *  serial numbers enabled and a quantity has been submitted. */
export interface ItemListEntry {
  value: string;
  codes?: string[];
}

export interface EventFormFieldRecord {
  id: string;
  event_id: string;
  label: string;
  field_type: EventFieldType;
  options: string[] | null;
  item_serial_config: ItemSerialConfig[] | null;
  is_required: boolean;
  order: number;
}

export interface CreateEventFieldInput {
  label: string;
  fieldType: EventFieldType;
  options?: string[];
  itemSerialConfig?: ItemSerialConfigInput[];
  isRequired?: boolean;
}

/** Value shape submitted per field — string for most types, string[] for checkbox,
 *  Record<itemLabel, ItemListEntry> for item_list. */
export type EventFieldValue = string | string[] | Record<string, ItemListEntry>;

/** One item_list entry within a response, with its own status/assignee tracking —
 *  additive to the response's own status/assignee, which stay response-wide. */
export interface ResponseItemRow {
  id: string;
  fieldId: string;
  fieldLabel: string;
  itemLabel: string;
  value: string;
  codes: string[];
  status: { id: string; name: string; tone: ResponseStatusTone } | null;
  assignee: { id: string; name: string } | null;
}
