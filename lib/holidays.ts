import HolidayJp from "@holiday-jp/holiday_jp";
import { format } from "date-fns";

/**
 * 指定期間の祝日を { "yyyy-MM-dd": "祝日名" } のMapで返す
 */
export function getHolidaysInRange(start: Date, end: Date): Map<string, string> {
  const holidays = HolidayJp.between(start, end);
  const map = new Map<string, string>();
  holidays.forEach((h) => {
    map.set(format(h.date, "yyyy-MM-dd"), h.name);
  });
  return map;
}

/**
 * 特定の日付が祝日かどうか調べ、祝日名を返す（祝日でなければ null）
 */
export function getHolidayName(date: Date): string | null {
  const holidays = HolidayJp.between(date, date);
  return holidays.length > 0 ? holidays[0].name : null;
}
