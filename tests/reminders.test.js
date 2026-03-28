import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReminderSchedule, cancelFutureReminders } from '../src/lib/reminders.js';

test('buildReminderSchedule returns the default 60/30/7/1 day schedule', () => {
  const schedule = buildReminderSchedule({ expirationDate: '2026-06-30' });

  assert.deepEqual(schedule, [
    { offsetDays: 60, sendOn: '2026-05-01', expiresOn: '2026-06-30' },
    { offsetDays: 30, sendOn: '2026-05-31', expiresOn: '2026-06-30' },
    { offsetDays: 7, sendOn: '2026-06-23', expiresOn: '2026-06-30' },
    { offsetDays: 1, sendOn: '2026-06-29', expiresOn: '2026-06-30' },
  ]);
});

test('cancelFutureReminders flags reminders on or after replacement receipt date', () => {
  const schedule = buildReminderSchedule({ expirationDate: '2026-06-30' });
  const canceled = cancelFutureReminders(schedule, '2026-06-23');

  assert.equal(canceled[0].canceled, false);
  assert.equal(canceled[1].canceled, false);
  assert.equal(canceled[2].canceled, true);
  assert.equal(canceled[3].canceled, true);
});
