/**
 * Calendar Utilities
 *
 * Date manipulation and calendar generation utilities for the editorial calendar.
 * Pure functions with no side effects.
 */

import type {
  CalendarDateRange,
  CalendarDayCell,
  CalendarView,
} from "@/types/calendar";

/**
 * Get the date range for a month view
 * Includes padding days from previous/next months to fill the grid
 *
 * @param date - Reference date within the month
 * @returns Date range with visible bounds for grid rendering
 *
 * @example
 * getMonthRange(new Date('2026-01-15'))
 * // Returns: { start: '2026-01-01', end: '2026-01-31', visibleStart: '2025-12-29', visibleEnd: '2026-02-08' }
 */
export function getMonthRange(date: Date): CalendarDateRange {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First and last day of the month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Find the first Sunday (or first day of week) before or on the first day
  // This ensures we have a complete grid starting from Sunday
  const firstDayOfMonth = start.getDay(); // 0 = Sunday, 6 = Saturday
  const visibleStart = new Date(start);
  visibleStart.setDate(visibleStart.getDate() - firstDayOfMonth);
  visibleStart.setHours(0, 0, 0, 0);

  // Find the last Saturday (or last day of week) after or on the last day
  // Grid is always 6 rows x 7 columns = 42 cells max
  const visibleEnd = new Date(visibleStart);
  visibleEnd.setDate(visibleEnd.getDate() + 42);
  visibleEnd.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    visibleStart,
    visibleEnd,
  };
}

/**
 * Get the date range for a week view
 *
 * @param date - Reference date within the week
 * @returns Date range from Sunday to Saturday
 *
 * @example
 * getWeekRange(new Date('2026-01-15')) // Thursday
 * // Returns: { start: '2026-01-11', end: '2026-01-17', visibleStart: '2026-01-11', visibleEnd: '2026-01-17' }
 */
export function getWeekRange(date: Date): CalendarDateRange {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    visibleStart: start,
    visibleEnd: end,
  };
}

/**
 * Get the date range for a day view
 *
 * @param date - Reference date
 * @returns Date range for a single day
 */
export function getDayRange(date: Date): CalendarDateRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    visibleStart: start,
    visibleEnd: end,
  };
}

/**
 * Get the appropriate date range based on calendar view
 *
 * @param date - Reference date
 * @param view - Calendar view mode
 * @returns Date range for the specified view
 */
export function getDateRange(
  date: Date,
  view: CalendarView
): CalendarDateRange {
  switch (view) {
    case "month":
      return getMonthRange(date);
    case "week":
      return getWeekRange(date);
    case "day":
      return getDayRange(date);
    default:
      return getMonthRange(date);
  }
}

/**
 * Generate calendar day cells for a given date and view
 * Used for rendering the calendar grid
 *
 * @param date - Reference date
 * @param view - Calendar view mode
 * @returns Array of calendar day cells
 *
 * @example
 * generateCalendarDays(new Date('2026-01-15'), 'month')
 * // Returns 42 day cells (6 rows x 7 columns)
 */
export function generateCalendarDays(
  date: Date,
  view: CalendarView
): CalendarDayCell[] {
  const range = getDateRange(date, view);
  const days: CalendarDayCell[] = [];

  if (view === "month") {
    // Generate 42 cells (6 rows x 7 columns)
    const current = new Date(range.visibleStart);
    const monthStart = new Date(range.start);
    const monthEnd = new Date(range.end);

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(current);
      days.push({
        date: cellDate,
        isCurrentMonth:
          cellDate >= monthStart && cellDate <= monthEnd,
        isToday: isToday(cellDate),
        posts: [], // Posts will be populated separately
      });
      current.setDate(current.getDate() + 1);
    }
  } else if (view === "week") {
    // Generate 7 cells (1 week)
    const current = new Date(range.start);
    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(current);
      days.push({
        date: cellDate,
        isCurrentMonth: true,
        isToday: isToday(cellDate),
        posts: [],
      });
      current.setDate(current.getDate() + 1);
    }
  } else {
    // Day view - single cell
    days.push({
      date: new Date(date),
      isCurrentMonth: true,
      isToday: isToday(date),
      posts: [],
    });
  }

  return days;
}

/**
 * Check if a given date is today
 *
 * @param date - Date to check
 * @returns true if the date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if two dates are in the same month
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if both dates are in the same month and year
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Check if two dates are the same day
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if both dates represent the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Format a date for display
 *
 * @param date - Date to format
 * @param format - Format type ('short', 'long', 'time', or custom Intl option)
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2026-01-15'), 'long') // "15 de janeiro de 2026"
 * formatDate(new Date('2026-01-15'), 'short') // "15 de jan."
 * formatDate(new Date('2026-01-15'), 'time') // "14:30"
 */
export function formatDate(
  date: Date,
  format: "short" | "long" | "time" | Intl.DateTimeFormatOptions = "long"
): string {
  const options: Intl.DateTimeFormatOptions =
    typeof format === "string"
      ? format === "short"
        ? { day: "numeric", month: "short" }
        : format === "time"
        ? { hour: "2-digit", minute: "2-digit" }
        : { year: "numeric", month: "long", day: "numeric" }
      : format;

  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

/**
 * Format month and year for calendar header
 *
 * @param date - Date within the month
 * @returns Formatted month/year string (e.g., "Janeiro 2026")
 */
export function formatMonthYear(date: Date): string {
  return formatDate(date, { year: "numeric", month: "long" });
}

/**
 * Format a week range string
 *
 * @param startDate - Week start date
 * @param endDate - Week end date
 * @returns Formatted week range (e.g., "12 - 18 Jan, 2026")
 */
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const sameMonth = startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    return `${startDate.getDate()} - ${endDate.getDate()} ${formatDate(
      startDate,
      { month: "short" }
    )}, ${startDate.getFullYear()}`;
  }

  return `${formatDate(startDate, "short")} - ${formatDate(
    endDate,
    "short"
  )}`;
}

/**
 * Extract content preview from JSON string or plain text
 *
 * @param content - JSON string or plain text content
 * @param maxLength - Maximum length of preview
 * @returns Truncated content preview
 *
 * @example
 * extractContentPreview('{"text": "This is a long post content that..."}')
 * // Returns: "This is a long post content that..."
 */
export function extractContentPreview(
  content: string | null,
  maxLength = 60
): string {
  if (!content) return "";

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content) as Record<string, unknown>;

    // Handle different content structures
    const text =
      (parsed.text as string) ||
      (parsed.caption as string) ||
      (parsed.content as string) ||
      (parsed.body as string) ||
      JSON.stringify(parsed);

    return truncateText(text, maxLength);
  } catch {
    // Not JSON, treat as plain text
    return truncateText(content, maxLength);
  }
}

/**
 * Truncate text to a maximum length
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Parse media URL JSON string
 *
 * @param mediaUrl - JSON string or null
 * @returns Array of media URLs
 */
export function parseMediaUrls(mediaUrl: string | null): string[] {
  if (!mediaUrl) return [];

  try {
    const parsed = JSON.parse(mediaUrl);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * Parse metadata JSON string
 *
 * @param metadata - JSON string or null
 * @returns Parsed metadata object
 */
export function parseMetadata<T = Record<string, unknown>>(
  metadata: string | null
): T | null {
  if (!metadata) return null;

  try {
    return JSON.parse(metadata) as T;
  } catch {
    return null;
  }
}

/**
 * Get the number of weeks in a month (4, 5, or 6)
 *
 * @param date - Date within the month
 * @returns Number of weeks in the month
 */
export function getWeeksInMonth(date: Date): number {
  const range = getMonthRange(date);
  const daysInMonth =
    Math.ceil(
      (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const firstDayOfWeek = range.visibleStart.getDay();
  return Math.ceil((daysInMonth + firstDayOfWeek) / 7);
}

/**
 * Add days to a date
 *
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 *
 * @param date - Base date
 * @param months - Number of months to add (can be negative)
 * @returns New date with months added
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the start of a day (midnight)
 *
 * @param date - Base date
 * @returns New date set to midnight
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a day (23:59:59.999)
 *
 * @param date - Base date
 * @returns New date set to end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if a date is within a given range
 *
 * @param date - Date to check
 * @param range - Date range to check against
 * @returns true if date is within the range
 */
export function isDateInRange(
  date: Date,
  range: { start: Date; end: Date }
): boolean {
  return date >= range.start && date <= range.end;
}

/**
 * Group posts by date
 *
 * @param posts - Array of posts with scheduledFor dates
 * @returns Record with dates as keys and post arrays as values
 */
export function groupPostsByDate<T extends { scheduledFor: Date | null }>(
  posts: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const post of posts) {
    if (!post.scheduledFor) continue;

    const key = startOfDay(post.scheduledFor).toISOString();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(post);
  }

  return grouped;
}

/**
 * Sort posts by scheduled time
 *
 * @param posts - Array of posts
 * @returns Sorted array by scheduledFor date
 */
export function sortPostsByScheduledTime<
  T extends { scheduledFor: Date | null }
>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (!a.scheduledFor) return 1;
    if (!b.scheduledFor) return -1;
    return a.scheduledFor.getTime() - b.scheduledFor.getTime();
  });
}

/**
 * Get time slots for day view (24 hours)
 *
 * @param date - Reference date
 * @returns Array of 24 time slots
 */
export function getTimeSlots(): Array<{ hour: number; label: string }> {
  const slots: Array<{ hour: number; label: string }> = [];

  for (let hour = 0; hour < 24; hour++) {
    slots.push({
      hour,
      label: hour.toString().padStart(2, "0") + ":00",
    });
  }

  return slots;
}

/**
 * Create a date-safe copy
 * Useful for avoiding mutation issues
 *
 * @param date - Date to clone
 * @returns New date instance
 */
export function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

/**
 * Get the difference in days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference (date2 - date1)
 */
export function getDaysDiff(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

/**
 * Format month label for navigation header
 *
 * @param date - Date within the month
 * @returns Formatted month and year (e.g., "Janeiro 2026")
 */
export function formatMonthLabel(date: Date): string {
  return formatDate(date, { year: "numeric", month: "long" });
}

/**
 * Format week label for navigation header
 *
 * @param date - Date within the week
 * @returns Formatted week range (e.g., "12 - 18 Jan, 2026")
 */
export function formatWeekLabel(date: Date): string {
  const range = getWeekRange(date);
  return formatWeekRange(range.start, range.end);
}

/**
 * Format day label for navigation header
 *
 * @param date - Date to format
 * @returns Formatted full date (e.g., "15 de janeiro de 2026")
 */
export function formatDayLabel(date: Date): string {
  return formatDate(date, { year: "numeric", month: "long", day: "numeric" });
}
