/** Postgres returns `time` columns as "HH:mm:ss" — trim to "HH:mm" for display and for <input type="time">. */
export function toHm(time: string | null | undefined): string {
  return time?.slice(0, 5) ?? '';
}
