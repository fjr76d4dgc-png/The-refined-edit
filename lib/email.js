import nodemailer from 'nodemailer';
import { BUSINESS, CANCELLATION_NOTICE_HOURS, REFUND_WINDOW_HOURS } from './config.js';
import { prettyDate, prettyTime } from './time.js';
import { siteUrl } from './stripe.js';

// Emails are sent from a Gmail account using an "app password".
// Set GMAIL_USER and GMAIL_APP_PASSWORD in Netlify. If they're missing, emails are simply skipped.
function transport() {
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!user || !pass) return null;
  const owner = (process.env.OWNER_EMAIL || '').trim() || user;
  return { mailer: nodemailer.createTransport({ service: 'gmail', auth: { user, pass } }), user, owner };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function shell(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#efe8e2;font-family:Georgia,'Times New Roman',serif;color:#1c1b1a">
  <div style="max-width:560px;margin:0 auto;padding:36px 22px">
    <div style="text-align:center;letter-spacing:.3em;font-size:15px">THE REFINED EDIT</div>
    <div style="width:60px;height:1px;background:#b0905f;margin:14px auto 28px"></div>
    <div style="background:#fbf8f5;border:1px solid #dccdbd;padding:28px 26px">
      <h1 style="font-weight:normal;font-size:26px;margin:0 0 16px">${esc(title)}</h1>
      ${inner}
    </div>
    <p style="text-align:center;font-size:12px;color:#7c746d;margin-top:22px">${esc(BUSINESS.tagline)} · ${esc(BUSINESS.area)} · @${esc(BUSINESS.instagram)}</p>
  </div></body></html>`;
}

const row = (k, v) => `<tr><td style="padding:6px 14px 6px 0;color:#7c746d;font-size:13px;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-size:16px">${v}</td></tr>`;

// To the client, only after their deposit is paid — this is the only email that contains the address.
export async function sendClientConfirmation(b) {
  const t = transport();
  if (!t || !b?.client_email) return;
  const due = Math.max(b.total_price - b.deposit, 0);
  const when = `${prettyDate(b.date)} at ${prettyTime(b.start_time)}`;
  const html = shell('You’re booked in ✨', `
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px">Hi ${esc(b.client_name.split(' ')[0])}, thank you for booking — your deposit has been received and your appointment is confirmed.</p>
    <table style="border-collapse:collapse;width:100%">
      ${row('Treatment', esc(b.service_summary))}
      ${row('When', esc(when))}
      ${row('Address', `${esc(BUSINESS.address)}<br><span style="font-size:13px;color:#7c746d">Home-based studio</span>`)}
      ${row('Deposit paid', `£${b.deposit}`)}
      ${row('Pay on the day', `£${due}${b.evening_surcharge ? ` (includes £${b.evening_surcharge} evening)` : ''}`)}
    </table>
    <h2 style="font-weight:normal;font-size:19px;margin:24px 0 8px">Before you arrive</h2>
    <ul style="padding-left:18px;margin:0;font-size:15px;line-height:1.6">
      ${BUSINESS.arrivalNotes.map((n) => `<li>${esc(n)}</li>`).join('')}
      <li>Please let me know about any allergies, sensitivities or medical concerns before your treatment.</li>
    </ul>
    <h2 style="font-weight:normal;font-size:19px;margin:24px 0 8px">Changes &amp; cancellations</h2>
    <p style="font-size:15px;line-height:1.6;margin:0">Please give ${CANCELLATION_NOTICE_HOURS} hours’ notice to cancel or reschedule — message <a href="${BUSINESS.instagramUrl}" style="color:#8f7246">@${esc(BUSINESS.instagram)}</a>. Deposits are only refundable within ${REFUND_WINDOW_HOURS} hours of paying; late cancellations and no-shows lose their deposit.</p>
    <p style="font-size:16px;margin:24px 0 0">See you soon 🤍</p>`);
  const text = `You're booked in!\n\nTreatment: ${b.service_summary}\nWhen: ${when}\nAddress: ${BUSINESS.address} (home-based studio)\nDeposit paid: £${b.deposit}\nPay on the day: £${due}\n\nBefore you arrive:\n- ${BUSINESS.arrivalNotes.join('\n- ')}\n\nPlease give ${CANCELLATION_NOTICE_HOURS} hours' notice to cancel or reschedule (message @${BUSINESS.instagram}). Deposits are only refundable within ${REFUND_WINDOW_HOURS} hours of paying.`;
  await t.mailer.sendMail({ from: `"${BUSINESS.name}" <${t.user}>`, to: b.client_email, replyTo: t.owner, subject: `You’re booked in — ${prettyDate(b.date, { weekday: 'short' })} at ${prettyTime(b.start_time)}`, html, text });
}

// To you, for every new booking (paid treatments and free patch tests).
export async function sendOwnerNotification(b) {
  const t = transport();
  if (!t) return;
  const to = t.owner;
  const when = `${prettyDate(b.date)} at ${prettyTime(b.start_time)}`;
  const html = shell(b.kind === 'patch_test' ? 'New patch test booked' : 'New booking 🎉', `
    <table style="border-collapse:collapse;width:100%">
      ${row('Client', esc(b.client_name))}
      ${row('Phone', esc(b.client_phone))}
      ${row('Email', esc(b.client_email || '—'))}
      ${row('Treatment', esc(b.service_summary))}
      ${row('When', esc(when))}
      ${b.kind === 'patch_test' ? row('Note', 'Free patch test — send them the address yourself') : row('Deposit', `£${b.deposit} paid · £${Math.max(b.total_price - b.deposit, 0)} due on the day`)}
      ${b.allergies ? row('Allergies', esc(b.allergies)) : ''}
      ${b.notes ? row('Notes', esc(b.notes)) : ''}
    </table>
    <p style="margin:22px 0 0"><a href="${siteUrl()}/admin" style="color:#8f7246">Open your dashboard →</a></p>`);
  await t.mailer.sendMail({ from: `"${BUSINESS.name} bookings" <${t.user}>`, to, subject: `${b.kind === 'patch_test' ? 'Patch test' : 'New booking'}: ${b.client_name} — ${prettyDate(b.date, { weekday: 'short' })} ${prettyTime(b.start_time)}`, html, text: `${b.client_name} booked ${b.service_summary} on ${when}. Phone: ${b.client_phone}.` });
}

// Never let an email problem break a booking.
export async function safely(fn, b) {
  try {
    await fn(b);
  } catch (e) {
    console.error('Email failed', e?.message || e);
  }
}
