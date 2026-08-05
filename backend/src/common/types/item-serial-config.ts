/** Per-item auto serial number config on an `item_list` field's `options[i]`.
 *  `next` is the server-managed cursor — advances by the quantity consumed
 *  each time a submission assigns codes for that item. */
export interface ItemSerialConfig {
  enabled: boolean;
  prefix: string;
  start: number;
  next: number;
}

/** Shape accepted from the admin field-builder — `next` is never client-supplied. */
export interface ItemSerialConfigInput {
  enabled: boolean;
  prefix?: string;
  start?: number;
}

/** Stored/returned shape of an `item_list` entry once serial codes may apply. */
export interface ItemListEntry {
  value: string;
  codes?: string[];
}
