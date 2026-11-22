'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SERVICES, GROUPS, PATCH_TEST, DEPOSIT, EVENING_SURCHARGE, EVENING_FROM, DURATION_LABEL, priceSelection } from '@/lib/config';
import { londonNow, addDays, prettyDate, prettyTime, weekday } from '@/lib/time';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthOf(dateStr) {
  return dateStr.slice(0, 7);
}
function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function BookingFlow({ initialServices = [], startWithPatch = false, afterPatchDate = null }) {
  const today = useMemo(() => londonNow().date, []);
  const minDate = afterPatchDate ? addDays(afterPatchDate, 2) : today;

  const [mode, setMode] = useState(startWithPatch ? 'patch' : afterPatchDate ? 'treatment' : null);
  const [step, setStep] = useState(startWithPatch ? 'date' : afterPatchDate ? 'services' : 'start');
  const [selected, setSelected] = useState(initialServices);

  const [month, setMonth] = useState(monthOf(minDate > today ? minDate : today));
  const [days, setDays] = useState({ dates: [], lastDay: null, loading: false });
  const [date, setDate] = useState(null);
  const [slots, setSlots] = useState({ list: [], loading: false, error: '' });
  const [slot, setSlot] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', phone: '', allergies: '', notes: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selection = mode === 'treatment' && selected.length ? priceSelection(selected) : null;
  const serviceKey = mode === 'patch' ? 'patch' : selected.slice().sort().join(',');

  // Load which dates have working hours
  useEffect(() => {
    if (step !== 'date') return;
    let cancelled = false;
    setDays((d) => ({ ...d, loading: true }));
    fetch(`/api/days?month=${month}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setDays({ dates: d.dates || [], lastDay: d.lastDay || null, loading: false }))
      .catch(() => !cancelled && setDays({ dates: [], lastDay: null, loading: false }));
    return () => { cancelled = true; };
  }, [month, step]);

  // Load free times for the chosen date
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlots({ list: [], loading: true, error: '' });
    const qs = mode === 'patch' ? 'patch=1' : `services=${encodeURIComponent(selected.join(','))}`;
    fetch(`/api/slots?date=${date}&${qs}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setSlots({ list: d.slots || [], loading: false, error: d.error || '' }))
      .catch(() => !cancelled && setSlots({ list: [], loading: false, error: 'Could not load times. Please try again.' }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceKey]);

  // Changing treatments changes the length, so clear the chosen time
  useEffect(() => { setSlot(null); }, [serviceKey]);

  function toggle(svc) {
    setSelected((cur) => {
      if (cur.includes(svc.id)) return cur.filter((id) => id !== svc.id);
      if (svc.group === 'lashes') return [...cur.filter((id) => SERVICES.find((s) => s.id === id)?.group !== 'lashes'), svc.id];
      return [...cur, svc.id];
    });
  }

  function choose(m) {
    setMode(m);
    setDate(null);
    setSlot(null);
    setStep(m === 'patch' ? 'date' : 'services');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function go(s) {
    setStep(s);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!agreed) return setError('Please tick to agree to the booking policy.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode === 'patch' ? 'patch_test' : 'treatment',
          services: selected,
          date,
          time: slot.time,
          ...form,
          agreed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        if (res.status === 409) {
          setSlot(null);
          setSlots((s) => ({ ...s, list: s.list.filter((x) => x.time !== slot.time) }));
          setStep('date');
        }
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Connection problem — please try again.');
      setSubmitting(false);
    }
  }

  // ── calendar cells ──
  const firstOfMonth = `${month}-01`;
  const lead = (weekday(firstOfMonth) + 6) % 7; // Monday-first
  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const canPrev = month > monthOf(minDate > today ? minDate : today);
  const canNext = !days.lastDay || month < monthOf(days.lastDay);

  const stepNames = mode === 'patch' ? ['Start', 'Date & time', 'Your details'] : ['Start', 'Treatments', 'Date & time', 'Your details'];
  const stepIndex = { start: 0, services: 1, date: mode === 'patch' ? 1 : 2, details: mode === 'patch' ? 2 : 3 }[step];

  const surcharge = mode === 'treatment' && slot?.evening ? EVENING_SURCHARGE : 0;
  const total = selection && !selection.error ? selection.price + surcharge : 0;

  return (
    <div className="book-layout">
      <div>
        <div className="steps">
          {stepNames.map((n, i) => <span key={n} className={i === stepIndex ? 'on' : ''}>{n}</span>)}
        </div>

        {/* ── 1. Start: patch test or treatment ── */}
        {step === 'start' && (
          <div className="panel">
            <h2>Before you book</h2>
            <p className="muted" style={{ margin: 0 }}>New to lash lifts, lamination or tints with us? We recommend a quick patch test first.</p>
            <div className="choice-grid">
              <button className={`choice ${mode === 'patch' ? 'on' : ''}`} onClick={() => choose('patch')}>
                <span className="badge">Recommended</span>
                <span className="title">Book a free patch test</span>
                <span className="desc">Free · {PATCH_TEST.duration} minutes · subject to availability. Book it at least 48 hours before your treatment.</span>
              </button>
              <button className={`choice ${mode === 'treatment' ? 'on' : ''}`} onClick={() => choose('treatment')}>
                <span className="badge soft">Optional</span>
                <span className="title">Continue to treatments</span>
                <span className="desc">I’ve had a patch test with The Refined Edit before, or I’m happy to continue without one.</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 2. Treatments ── */}
        {step === 'services' && (
          <div className="panel">
            <h2>Choose your treatments</h2>
            {afterPatchDate ? (
              <p className="success" style={{ margin: 0 }}>Patch test booked for {prettyDate(afterPatchDate)} ✓ — treatment dates start 48 hours after it.</p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Combine a lash lift with any brow treatments.</p>
            )}
            {GROUPS.map((g) => (
              <div className="svc-group" key={g.id}>
                <h3><span>{g.name}</span><span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{g.note}</span></h3>
                {SERVICES.filter((s) => s.group === g.id).map((s) => {
                  const on = selected.includes(s.id);
                  return (
                    <button key={s.id} className={`svc ${g.id === 'lashes' ? 'radio' : ''} ${on ? 'on' : ''}`} onClick={() => toggle(s)} aria-pressed={on}>
                      <span className="tick">{on ? '✓' : ''}</span>
                      <span>
                        <span className="name">{s.name}</span><br />
                        <span className="dur">{DURATION_LABEL}</span>
                      </span>
                      <span className="p">£{s.price}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="bar">
              <button className="link-btn" onClick={() => go('start')}>← Back</button>
              <button className="btn" disabled={!selected.length} onClick={() => go('date')}>Choose a date</button>
            </div>
          </div>
        )}

        {/* ── 3. Date & time ── */}
        {step === 'date' && (
          <div className="panel">
            <h2>{mode === 'patch' ? 'When suits you for your patch test?' : 'Pick a date & time'}</h2>
            <p className="muted" style={{ margin: 0 }}>
              Dates with a dot have availability.{mode === 'treatment' && <> Appointments from {prettyTime(EVENING_FROM)} are +£{EVENING_SURCHARGE}.</>}
            </p>

            <div className="cal">
              <div className="cal-head">
                <button className="cal-nav" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
                <strong>{monthLabel(month)}</strong>
                <button className="cal-nav" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
              </div>
              <div className="cal-grid">
                {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
                {cells.map((c, i) => {
                  if (!c) return <div key={`b${i}`} />;
                  const avail = days.dates.includes(c) && c >= minDate;
                  return (
                    <button
                      key={c}
                      className={`cal-day ${avail ? 'avail' : ''} ${date === c ? 'on' : ''}`}
                      disabled={!avail}
                      onClick={() => { setDate(c); setSlot(null); }}
                    >
                      {Number(c.slice(8))}
                    </button>
                  );
                })}
              </div>
              {!days.loading && days.dates.filter((d) => d >= minDate).length === 0 && (
                <p className="muted" style={{ marginTop: 14 }}>No availability this month — try the next one.</p>
              )}
            </div>

            {date && (
              <div style={{ marginTop: 26 }}>
                <div className="eyebrow">{prettyDate(date)}</div>
                {slots.loading && <p className="muted">Finding times…</p>}
                {slots.error && <p className="error">{slots.error}</p>}
                {!slots.loading && !slots.error && slots.list.length === 0 && (
                  <p className="muted">Fully booked for this length of appointment — please try another day.</p>
                )}
                <div className="slots">
                  {slots.list.map((s) => (
                    <button key={s.time} className={`slot ${slot?.time === s.time ? 'on' : ''}`} onClick={() => setSlot(s)}>
                      {prettyTime(s.time)}
                      {mode === 'treatment' && s.evening && <small>Evening +£{EVENING_SURCHARGE}</small>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="error" style={{ marginTop: 18 }}>{error}</p>}
            <div className="bar">
              <button className="link-btn" onClick={() => go(mode === 'patch' ? 'start' : 'services')}>← Back</button>
              <button className="btn" disabled={!slot} onClick={() => go('details')}>Continue</button>
            </div>
          </div>
        )}

        {/* ── 4. Details ── */}
        {step === 'details' && (
          <form className="panel" onSubmit={submit}>
            <h2>Your details</h2>
            <p className="muted" style={{ margin: 0 }}>
              {mode === 'patch'
                ? 'Your patch test is free — no payment needed.'
                : `You’ll pay your £${DEPOSIT} deposit securely with Stripe on the next screen.`}
            </p>
            <div className="form-grid">
              <label className="field full">Full name
                <input type="text" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="field">Email
                <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="field">Mobile number
                <input type="tel" required autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="field full">Allergies, sensitivities or medical concerns
                <textarea placeholder="Leave blank if none" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              </label>
              <label className="field full">Anything else? (optional)
                <textarea placeholder="E.g. the brow shape you’d like" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
              <label className="check full">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  I’ve read and agree to the <Link href="/policy" target="_blank">booking policy</Link>
                  {mode === 'treatment'
                    ? ', including that my deposit is only refundable within 24 hours of paying and that I need to give 48 hours’ notice to cancel or reschedule.'
                    : '.'}
                </span>
              </label>
            </div>
            {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
            <div className="bar">
              <button type="button" className="link-btn" onClick={() => go('date')}>← Back</button>
              <button className="btn" disabled={submitting}>
                {submitting ? 'Please wait…' : mode === 'patch' ? 'Confirm free patch test' : `Pay £${DEPOSIT} deposit`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Summary ── */}
      <aside className="summary">
        <h3>Your booking</h3>
        {!mode && <p className="empty">Start by choosing a patch test or treatment.</p>}

        {mode === 'patch' && (
          <>
            <div className="row"><span>{PATCH_TEST.name}</span><span>Free</span></div>
            {date && <div className="row"><span>{prettyDate(date, { weekday: 'short' })}</span><span>{slot ? prettyTime(slot.time) : '—'}</span></div>}
            <div className="row total deposit"><span>Due today</span><span>£0</span></div>
            <p className="fine">Patch tests are subject to availability. Book your treatment at least 48 hours after your patch test.</p>
          </>
        )}

        {mode === 'treatment' && (
          <>
            {!selection && <p className="empty">No treatments chosen yet.</p>}
            {selection?.items?.map((s) => (
              <div className="row" key={s.id}><span>{s.name}</span><span>£{s.price}</span></div>
            ))}
            {surcharge > 0 && <div className="row"><span>Evening appointment</span><span>£{surcharge}</span></div>}
            {date && <div className="row"><span>{prettyDate(date, { weekday: 'short' })}</span><span>{slot ? prettyTime(slot.time) : '—'}</span></div>}
            {selection && !selection.error && (
              <>
                <div className="row total"><span>Total</span><span>£{total}</span></div>
                <div className="row deposit"><span>Deposit due today</span><span>£{DEPOSIT}</span></div>
                <div className="row"><span>Pay on the day</span><span>£{Math.max(total - DEPOSIT, 0)}</span></div>
                <p className="fine">Each treatment takes {DURATION_LABEL}. Deposits are refundable only within 24 hours of payment. 48 hours’ notice needed to cancel or reschedule.</p>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
