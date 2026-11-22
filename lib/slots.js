import { toMin, toHHMM } from './time.js';

/**
 * Works out which start times are free on one day.
 *
 * windows   – your working hours that day: [{ start_time: '09:00', end_time: '20:00' }, ...]
 * bookings  – appointments already taking up time: [{ start_time, end_time }]
 * duration  – length of the appointment being booked (minutes)
 * step      – offer a start time every X minutes
 * buffer    – gap kept free before/after every appointment
 * earliest  – (optional) minutes-since-midnight before which nothing can start (used for "today")
 * eveningFrom – minutes-since-midnight from which the evening surcharge applies
 */
export function computeSlots({ windows, bookings, duration, step, buffer, earliest = 0, eveningFrom = 17 * 60 }) {
  const blocked = bookings.map((b) => [toMin(b.start_time) - buffer, toMin(b.end_time) + buffer]);
  const result = new Set();

  for (const w of windows) {
    const ws = toMin(w.start_time);
    const we = toMin(w.end_time);
    for (let s = ws; s + duration <= we; s += step) {
      if (s < earliest) continue;
      const e = s + duration;
      const clash = blocked.some(([bs, be]) => s < be && e > bs);
      if (!clash) result.add(s);
    }
  }

  return [...result]
    .sort((a, b) => a - b)
    .map((s) => ({ time: toHHMM(s), end: toHHMM(s + duration), evening: s >= eveningFrom }));
}
