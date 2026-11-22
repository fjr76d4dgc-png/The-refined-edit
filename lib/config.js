// ─────────────────────────────────────────────────────────────
//  THE REFINED EDIT — business settings
//  Edit prices, durations and rules here. Prices are in pounds,
//  durations in minutes.
// ─────────────────────────────────────────────────────────────

export const BUSINESS = {
  name: 'The Refined Edit',
  tagline: 'Lash Lifts & Brow Laminations',
  area: 'Birmingham, B19',
  instagram: 'the.refinededit_',
  instagramUrl: 'https://instagram.com/the.refinededit_',
  timezone: 'Europe/London',
  // Only shown to clients after they've booked (confirmation pages), never on public pages.
  address: '17 Lime Grove, Birmingham B19 1RX',
  arrivalNotes: [
    'This is a home-based studio, so there’s no space for waiting or plus-ones — please come on your own.',
    'Please message me when you’ve arrived rather than ringing the bell.',
    'Arrive on time — late arrivals may affect your appointment time.',
  ],
};

// What clients see next to each treatment (the calendar still uses each treatment's own duration below)
export const DURATION_LABEL = '45–90 mins';

export const DEPOSIT = 20; // flat deposit per treatment booking (£)
export const EVENING_SURCHARGE = 10; // added to appointments starting at/after EVENING_FROM (£)
export const EVENING_FROM = '17:00';
export const BUFFER_MINUTES = 15; // clean-down gap kept free between appointments
export const SLOT_STEP_MINUTES = 30; // start times offered every X minutes
export const MIN_NOTICE_HOURS = 3; // can't book a slot starting sooner than this
export const MAX_DAYS_AHEAD = 60; // how far ahead clients can book
export const CHECKOUT_HOLD_MINUTES = 30; // slot is held this long while the client pays
export const REFUND_WINDOW_HOURS = 24; // deposit refundable within 24h of paying
export const CANCELLATION_NOTICE_HOURS = 48;

// Patch test: free, no deposit, subject to availability.
export const PATCH_TEST = {
  id: 'patch-test',
  name: 'Patch Test',
  price: 0,
  duration: 15,
  description:
    'A quick, free sensitivity test for lash lift, lamination and tint products. Recommended for all new clients — please book it at least 48 hours before your treatment.',
};

// group: 'lashes' allows one choice; 'brows' allows several.
// Durations: each treatment takes 45–90 minutes. Booking several treatments adds their times together.
export const SERVICES = [
  {
    id: 'korean-lash-lift-tint',
    group: 'lashes',
    name: 'Korean Lash Lift with Tint',
    price: 45,
    duration: 90,
    description:
      'The latest advanced lifting technique for a soft, glossy, naturally elevated lash with long-lasting definition.',
  },
  {
    id: 'korean-lash-lift',
    group: 'lashes',
    name: 'Korean Lash Lift without Tint',
    price: 40,
    duration: 75,
    description:
      'The latest advanced lifting technique for a soft, glossy, naturally elevated lash with long-lasting definition.',
  },
  {
    id: 'lvl-lash-lift-tint',
    group: 'lashes',
    name: 'LVL Lash Lift with Tint',
    price: 40,
    duration: 90,
    description:
      'A classic lash lift that enhances your natural lashes by lifting from the root for a beautifully open-eyed look.',
  },
  {
    id: 'lvl-lash-lift',
    group: 'lashes',
    name: 'LVL Lash Lift without Tint',
    price: 35,
    duration: 75,
    description:
      'A classic lash lift that enhances your natural lashes by lifting from the root for a beautifully open-eyed look.',
  },
  {
    id: 'brow-lamination',
    group: 'brows',
    name: 'Brow Lamination',
    price: 30,
    duration: 60,
    description:
      'Creates fuller, smoother, perfectly styled brows by setting the hairs into your desired shape.',
  },
  {
    id: 'brow-mapping',
    group: 'brows',
    name: 'Brow Mapping',
    price: 5,
    duration: 45,
    description:
      'A bespoke brow design service using precise facial measurements to create your ideal brow shape.',
  },
  {
    id: 'brow-wax',
    group: 'brows',
    name: 'Brow Wax',
    price: 25,
    duration: 45,
    description: 'A gentle wax for precise shaping while respecting your natural brows.',
  },
  {
    id: 'brow-bleaching',
    group: 'brows',
    name: 'Brow Bleaching (Halal Brows)',
    price: 25,
    duration: 45,
    description: 'Lightens the brow hairs for a softer, more natural look without hair removal.',
  },
  {
    id: 'bespoke-brow-tint',
    group: 'brows',
    name: 'Bespoke Brow Tint',
    price: 20,
    duration: 45,
    description:
      'A custom-blended tint tailored to your complexion and hair colour for naturally enhanced definition.',
  },
];

export const GROUPS = [
  { id: 'lashes', name: 'Lashes', note: 'Choose one' },
  { id: 'brows', name: 'Brows', note: 'Choose any' },
];

export function getServices(ids) {
  return ids.map((id) => SERVICES.find((s) => s.id === id)).filter(Boolean);
}

// Validates a selection and returns totals, or { error }.
export function priceSelection(ids) {
  const unique = [...new Set(ids)];
  const items = getServices(unique);
  if (items.length === 0 || items.length !== unique.length) return { error: 'Please choose at least one treatment.' };
  if (items.filter((s) => s.group === 'lashes').length > 1) return { error: 'Please choose just one lash lift.' };
  return {
    items,
    duration: items.reduce((t, s) => t + s.duration, 0),
    price: items.reduce((t, s) => t + s.price, 0),
    summary: items.map((s) => s.name).join(' + '),
  };
}
