import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { EventStatus } from '../../../common/enums/event-status.enum';

// Accepts "HH:mm" (from the <input type="time"> the frontend submits) and
// "HH:mm:ss" (Postgres's canonical `time` text representation, which is what
// comes back on GET and round-trips into an edit form's initial values).
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  location: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  @IsOptional()
  @IsString()
  messageTemplate?: string;

  /** Leave unset/empty for a random 10-digit code; set to switch this event to a sequential series. */
  @IsOptional()
  @IsString()
  referencePrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  referenceNextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  referencePadding?: number;
}
