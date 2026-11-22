# The Refined Edit — website & booking system

Your site includes:

- **Public pages:** Home, Treatments & prices, Results gallery, Policy
- **Online booking** (`/book`):
  1. Clients choose a **free patch test (recommended)** or continue to treatments.
  2. They pick their treatments. They can choose one lash lift and any number of brow treatments.
  3. A calendar shows only your free times. Times from 5pm show "+£10 evening".
  4. They pay a **£20 deposit with Stripe**. The slot is held for 30 minutes while they pay, so nobody can double-book it.
  5. Patch tests are free and confirm instantly. After booking one, the client can book a treatment from 48 hours after the patch test.
- **Your dashboard** (`/admin`, password protected):
  - **Bookings:** your upcoming appointments, contact and WhatsApp links, allergies and notes, and what's due on the day. You can mark appointments completed, no-show or cancelled, and refund deposits with one button. The refund button flags whether the client is still inside the 24-hour refund window.
  - **My availability:** set your hours week by week. There are one-tap presets (9am–8pm, 9am–5pm, evenings), a "Copy last week" button and multiple time blocks per day.
  - **Add booking:** add clients who book by DM. This blocks the time on the website too.

Running costs are £0/month on the free plans of Vercel and Supabase. Stripe charges its usual card fee on each deposit.

---

## Setup (about 30–45 minutes, one time only)

You'll need free accounts on **GitHub**, **Supabase**, **Stripe** and **Vercel**.

### 1. Put the code on GitHub
1. Unzip this folder.
2. Create a new **private** repository on github.com called `the-refined-edit`.
3. Upload the files using "uploading an existing file" on the empty repo page. Drag in everything **inside** the folder, not the folder itself. Or use the terminal:
   ```bash
   cd the-refined-edit
   git init && git add . && git commit -m "First version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/the-refined-edit.git
   git push -u origin main
   ```

### 2. Create the database (Supabase)
1. On supabase.com, create a **New project**. Choose region **London (eu-west-2)** and save the database password somewhere.
2. Go to **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** key (click reveal) → this is `SUPABASE_SERVICE_ROLE_KEY`. ⚠️ Keep it secret and never post it anywhere.

### 3. Stripe
1. In the Stripe dashboard, stay in **Test mode** (toggle at the top) for now.
2. Go to **Developers → API keys** and copy the **Secret key** (`sk_test_…`) → this is `STRIPE_SECRET_KEY`.
3. Go to **Settings → Business → Customer emails** and turn on **Successful payments**, so clients get an emailed receipt.

### 4. Put it online (Vercel)
1. On vercel.com, click **Add New → Project**, then import your GitHub repo.
2. Before you click Deploy, open **Environment Variables** and add these:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
   | `STRIPE_SECRET_KEY` | from step 3 |
   | `STRIPE_WEBHOOK_SECRET` | type `temp` for now (you'll replace it in step 5) |
   | `ADMIN_PASSWORD` | the password you'll use to log in to your dashboard |
   | `ADMIN_SESSION_SECRET` | any long random string (40+ random letters and numbers) |
   | `NEXT_PUBLIC_SITE_URL` | leave it out for now |

3. Click **Deploy**. You'll get an address like `https://the-refined-edit.vercel.app`.
4. Add `NEXT_PUBLIC_SITE_URL` with that address (no `/` at the end). Then go to **Deployments → ⋯ → Redeploy**.

### 5. Connect the Stripe webhook
The webhook is how Stripe tells your site that a deposit was paid.
1. In Stripe, go to **Developers → Webhooks → Add endpoint**.
2. For the endpoint URL, enter `https://YOUR-SITE/api/stripe/webhook`.
3. Under events, select `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`.
4. Copy the **Signing secret** (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET`, then **Redeploy**.

### 6. Set your hours and do a test booking
1. Go to `https://YOUR-SITE/admin`, log in, open **My availability**, set this week's hours and click **Save week**.
2. Make a booking on `/book`. Pay with the Stripe test card **4242 4242 4242 4242**, using any future expiry date and any CVC.
3. Check that the booking shows in your dashboard as **Confirmed · Deposit paid**. Try the **Refund deposit** button too.

### 7. Go live
1. In Stripe, finish **Activate account**, which asks for your bank details for payouts.
2. Switch Stripe to **Live mode**. Then:
   - Copy the live secret key (`sk_live_…`) into `STRIPE_SECRET_KEY` in Vercel.
   - Create the webhook again in live mode (step 5) and copy its new `whsec_…` into Vercel.
3. Redeploy. You're now taking real deposits.
4. Optional: connect your own domain in **Vercel → Settings → Domains** (e.g. therefinededit.co.uk), then update `NEXT_PUBLIC_SITE_URL` and your Stripe webhook URL to the new address.
5. Put the link in your Instagram bio 🤍

---

## Changing things later

| To change… | Edit |
|---|---|
| Prices, treatment durations, descriptions | `lib/config.js` → `SERVICES` |
| Deposit, evening surcharge, gap between clients, how far ahead clients can book | `lib/config.js` (top of file) |
| Patch test length or text | `lib/config.js` → `PATCH_TEST` |
| Policy wording | `components/PolicyPoints.js` |
| Results photos | Add the photo to `public/results/` and list it in `lib/results.js` |
| Homepage text | `app/(site)/page.js` |

**Durations** are set between 45 and 90 minutes per treatment in `lib/config.js`. The calendar uses them to work out free times, so adjust them if a treatment usually runs shorter or longer.

When you commit a change on GitHub, Vercel automatically rebuilds the site in about a minute.

### Running it on your Mac (optional)
```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev                  # open http://localhost:3000
```
To test webhooks locally, install the Stripe CLI and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

---

## How the rules work
- **Deposit:** £20 for every treatment booking. The remaining balance is shown to the client and in your dashboard as "due on the day".
- **Evening:** an appointment starting at or after 5pm costs +£10. This is added to the total, not to the deposit.
- **Refunds:** use the **Refund deposit** button. It refunds the client through Stripe and cancels the booking. Inside 24 hours of payment, it just asks you to confirm. Outside 24 hours, it warns you first, so you can still make a goodwill exception.
- **Cancel (keep deposit):** for cancellations with less than 48 hours' notice and similar cases. The slot opens up again for other clients.
- **Double bookings are impossible:** the database itself rejects overlapping appointments. A 15-minute clean-down gap is also kept between clients.
- **Patch tests:** free, 15 minutes, and they use the same availability as treatments. If you don't want patch tests at certain times, just don't open those hours.
