import { IsObject } from 'class-validator';

export type EventFieldValue = string | string[] | Record<string, string>;

export class SubmitEventResponseDto {
  /** Keyed by Event_Form_Fields.id — string for most types, string[] for checkbox,
   *  Record<itemLabel, value> for item_list. */
  @IsObject()
  values: Record<string, EventFieldValue>;
}
