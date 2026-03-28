const DEFAULT_OFFSETS = [60, 30, 7, 1];

function toDateOnly(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateLike}`);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function shiftDays(dateLike, days) {
  const date = toDateOnly(dateLike);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function toIsoDate(dateLike) {
  return toDateOnly(dateLike).toISOString().slice(0, 10);
}

export function buildReminderSchedule({ expirationDate, offsets = DEFAULT_OFFSETS }) {
  const exp = toDateOnly(expirationDate);

  return [...new Set(offsets)]
    .filter((offset) => Number.isInteger(offset) && offset >= 0)
    .sort((a, b) => b - a)
    .map((offsetDays) => ({
      offsetDays,
      sendOn: toIsoDate(shiftDays(exp, -offsetDays)),
      expiresOn: toIsoDate(exp),
    }));
}

export function cancelFutureReminders(reminders, replacementReceivedDate) {
  const cutoff = toIsoDate(replacementReceivedDate);
  return reminders.map((reminder) => ({
    ...reminder,
    canceled: reminder.sendOn >= cutoff,
  }));
}

export { DEFAULT_OFFSETS };
