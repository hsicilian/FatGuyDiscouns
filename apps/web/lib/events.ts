import type { ShowEvent } from "@fatguydiscounts/types";

export function formatEventLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

export function labelTimezone(timeZone: string, isCustomerLocal: boolean) {
  if (!isCustomerLocal) {
    return "ET";
  }

  switch (timeZone) {
    case "America/Chicago":
      return "CT";
    case "America/Denver":
      return "MT";
    case "America/Los_Angeles":
      return "PT";
    case "America/New_York":
    default:
      return "ET";
  }
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const utcEquivalent = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcEquivalent - date.getTime();
}

export function zonedLocalDateTimeToIso(localDateTime: string, timeZone: string) {
  const [datePart, timePart] = localDateTime.split("T");
  if (!datePart || !timePart) {
    throw new Error("Event date and time are required.");
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  let timestamp = baseUtc;
  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(timestamp), timeZone);
    timestamp = baseUtc - offset;
  }

  return new Date(timestamp).toISOString();
}

export function formatIsoForDateTimeInput(iso: string, timeZone: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = getZonedParts(date, timeZone);
  const year = String(parts.year);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function buildWeeklyRecurringLocalDateTimes(
  startsAtLocal: string,
  repeatWeekly: boolean,
  repeatUntilLocal: string,
) {
  if (!repeatWeekly) {
    return [startsAtLocal];
  }

  const [datePart, timePart] = startsAtLocal.split("T");
  if (!datePart || !timePart) {
    throw new Error("Event date and time are required.");
  }

  if (!repeatUntilLocal) {
    throw new Error("Repeat end date is required for weekly repeating events.");
  }

  const [startYear, startMonth, startDay] = datePart.split("-").map(Number);
  const [endYear, endMonth, endDay] = repeatUntilLocal.split("-").map(Number);
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12));
  const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Repeat end date is invalid.");
  }

  if (endDate.getTime() < startDate.getTime()) {
    throw new Error("Repeat end date must be on or after the event date.");
  }

  const dates: string[] = [];
  const current = new Date(startDate);

  while (current.getTime() <= endDate.getTime()) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day = String(current.getUTCDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}T${timePart}`);
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return dates;
}

export function getCalendarMonth(events: ShowEvent[], timeZone: string) {
  const now = new Date();
  const current = getZonedParts(now, timeZone);
  const currentMonthEvent = events.find((event) => {
    const parts = getZonedParts(new Date(event.startsAt), timeZone);
    return parts.year === current.year && parts.month === current.month;
  });

  if (currentMonthEvent) {
    return { year: current.year, month: current.month };
  }

  const firstEvent = events[0];
  if (!firstEvent) {
    return { year: current.year, month: current.month };
  }

  const eventParts = getZonedParts(new Date(firstEvent.startsAt), timeZone);
  return { year: eventParts.year, month: eventParts.month };
}

function addMonths(year: number, month: number, offset: number) {
  const base = new Date(Date.UTC(year, month - 1 + offset, 1, 12));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
  };
}

export function buildCalendarCells(events: ShowEvent[], timeZone: string, monthOffset = 0) {
  const startMonth = getCalendarMonth(events, timeZone);
  const { year, month } = addMonths(startMonth.year, startMonth.month, monthOffset);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));

  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(firstWeekday);
  const byDay = new Map<number, ShowEvent[]>();

  for (const event of events) {
    const parts = getZonedParts(new Date(event.startsAt), timeZone);
    if (parts.year === year && parts.month === month) {
      const existing = byDay.get(parts.day) ?? [];
      existing.push(event);
      byDay.set(parts.day, existing);
    }
  }

  const cells: Array<{ key: string; day: number | null; events: ShowEvent[] }> = Array.from({ length: weekdayIndex < 0 ? 0 : weekdayIndex }, (_, index) => ({
    key: `empty-${index}`,
    day: null,
    events: [] as ShowEvent[],
  }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `day-${day}`,
      day,
      events: byDay.get(day) ?? [],
    });
  }

  return {
    year,
    month,
    monthLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone,
    }).format(new Date(Date.UTC(year, month - 1, 1, 12))),
    cells,
  };
}

export function filterEventsForCalendarMonth(
  events: ShowEvent[],
  timeZone: string,
  monthOffset = 0,
) {
  const calendar = buildCalendarCells(events, timeZone, monthOffset);
  return events.filter((event) => {
    const parts = getZonedParts(new Date(event.startsAt), timeZone);
    return parts.year === calendar.year && parts.month === calendar.month;
  });
}
