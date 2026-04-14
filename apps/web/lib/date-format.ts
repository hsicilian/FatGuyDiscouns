const easternTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const easternDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getEasternDateInputValue(date = new Date()) {
  return easternDateFormatter.format(date);
}

export function formatEasternTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = easternTimestampFormatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  const month = lookup.month ?? "";
  const day = lookup.day ?? "";
  const year = lookup.year ?? "";
  const hour = lookup.hour ?? "";
  const minute = lookup.minute ?? "";
  const dayPeriod = (lookup.dayPeriod ?? "").toLowerCase();

  return `${month}/${day}/${year}, ${hour}:${minute}${dayPeriod} est`;
}
