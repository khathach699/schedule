import { dayKey } from "./model";
export type Interval = { start: number; end: number };
/** Split actual running intervals by local calendar date, including DST boundaries. */
export function splitIntervals(
  intervals: Interval[],
  timezone: string,
  limitSeconds: number,
) {
  const minutes: Record<string, number> = {};
  let budget = limitSeconds * 1000;
  for (const interval of intervals) {
    let cursor = interval.start;
    const end = Math.min(interval.end, cursor + budget);
    while (cursor < end) {
      const key = dayKey(new Date(cursor), timezone);
      let boundary = end;
      if (dayKey(new Date(end - 1), timezone) !== key) {
        let lo = cursor,
          hi = end;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          if (dayKey(new Date(mid), timezone) === key) lo = mid;
          else hi = mid;
        }
        boundary = hi;
      }
      minutes[key] = (minutes[key] || 0) + (boundary - cursor) / 60000;
      budget -= boundary - cursor;
      cursor = boundary;
    }
    if (budget <= 0) break;
  }
  return minutes;
}
