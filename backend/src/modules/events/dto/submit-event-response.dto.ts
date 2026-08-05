import { IsObject } from 'class-validator';
import { ItemListEntry } from '../../../common/types/item-serial-config';

export type { ItemListEntry };

export type EventFieldValue = string | string[] | Record<string, ItemListEntry>;

export class SubmitEventResponseDto {
  /** Keyed by Event_Form_Fields.id — string for most types, string[] for checkbox,
   *  Record<itemLabel, ItemListEntry> for item_list (entry.codes is server-assigned
   *  when the item has auto serial numbers enabled). */
  @IsObject()
  values: Record<string, EventFieldValue>;
}
