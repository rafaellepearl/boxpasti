# Box Pasti

A one-page list that shows the kitchen whose meal QR to scan and box at each lunch and dinner.
Students who can't make it to the canteen add themselves, and the kitchen ticks them off as they box.
It's a static site on GitHub Pages, with the shared data in Supabase (free tier). There's no login.

<p>
  <img src="docs/screenshots/to-box.png" width="200" alt="To box list for Thursday lunch, with a 6 of 10 boxed progress bar and a Mark all boxed button">
  <img src="docs/screenshots/boxed.png" width="200" alt="Cards still to box above green cards the kitchen has marked as boxed">
  <img src="docs/screenshots/qr.png" width="200" alt="An enlarged QR with Mark boxed and Close buttons">
</p>
<p>
  <img src="docs/screenshots/not-boxed.png" width="200" alt="Not boxed list with Box me buttons">
  <img src="docs/screenshots/edit.png" width="200" alt="Edit sheet with name, QR upload and a weekly Monday to Friday schedule grid">
</p>

<sub>Screenshots use made-up people and fake QR codes.</sub>

```
index.html                page
style.css                 styles
app.js                    logic (Supabase URL and publishable key at the top)
supabase/schema.sql       tables, security policies, Realtime, QR storage bucket
docs/screenshots/         images for this README
```

## How it works

**For students**

- **Add your QR** once: your name, a screenshot of the QR from the meal app, and, if you like, the meals you always miss each week.
- **Box me** or **Unbox** changes only the current meal. For example, `Box me` on Thursday lunch doesn't touch Friday.

**For the kitchen**

- **To box** shows everyone whose meal needs boxing right now. Tap a QR to enlarge it for scanning.
- Tap **Mark boxed** on a card when it's done, or **Mark all boxed** at the top once you've finished the batch.
  Boxed cards turn green, show a "Boxed" stamp and move to the bottom. The bar at the top counts how many are done.
- If someone adds themselves after that, their card appears at the top without the green, so it's easy to spot.
  Tap **✓ Boxed** on a card to undo it.

**Rules**

- Rome time decides the meal: lunch before 15:00, dinner until 21:30, then the next day's lunch. Weekends show Monday lunch.
- Overrides (`Box me` / `Unbox`) and kitchen marks are saved for one meal only, keyed like `2026-10-01-L`.
  Each meal has a new key, so the list resets by itself twice a day. Rows older than 7 days are deleted when someone opens the page.
- When someone uploads a screenshot, the page finds the QR in it, crops it, shrinks it to 400px and saves it as a PNG.
- Every open phone updates live through Supabase Realtime.

## Try it locally

```bash
python -m http.server 8080
```

Open http://localhost:8080. To see a different meal, add `?at=2026-10-01T16:00`, which is read as Rome time.
If `SUPABASE_ANON_KEY` in `app.js` is empty, the page runs in **demo mode**, with made-up people and data saved only in your browser.

## Set up your own Supabase project

1. Create a free project at https://supabase.com and pick an EU region.
2. Go to **SQL Editor → New query**, paste all of `supabase/schema.sql` and click **Run**.
   This creates the tables, the access policies, Realtime and the public `qr` image bucket. It's safe to run again after an update.
3. Go to **Project Settings → API** and copy the **Project URL** and the **publishable** (or legacy `anon`) key.
   Paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `app.js`.
   Never use the `service_role` / secret key here.

The list starts empty and people add themselves. The original group's schedule is kept in a local `supabase/seed.local.sql`, which isn't in the repo because it lists people's names.

## Publish on GitHub Pages

1. In the repo, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then `main` and `/ (root)`.
2. After a minute, the site is live at `https://<user>.github.io/<repo>/`. Share that link in the group chat.

## Security: what's public and what isn't

- **The key in `app.js` is meant to be public.** It's the Supabase *publishable* key, which every browser needs to talk to the database.
  What it can do is set by the Row Level Security policies in `schema.sql`, not by keeping the key hidden.
- **The access is deliberately open.** Anyone who has the site link (or reads this repo) can see every QR and add, edit or delete entries.
  That's the trade-off for having no login. The page has `noindex`, so search engines won't list it, but treat the link as shared with the group, not secret.
- **Kept out of the repo:** the PDF with everyone's real QR codes, the real names (`seed.local.sql`), and local tooling config.
- If the open access becomes a problem, the next step is a shared group passcode checked by the database policies.

## Things to know

- **Free-tier pause:** Supabase pauses free projects after about a week with no activity, for example over the holidays.
  Click **Restore** in the dashboard; your data is kept.
