# Box Pasti — handoff to Claude Code

## What to paste into Claude Code

> Build the Box Pasti site described in `HANDOFF.md`. Use `design/Main.dc.html` as the visual and behaviour reference only (it's a design-canvas prototype; don't keep its `<x-dc>` / `support.js` format). Output a plain static site for GitHub Pages: `index.html`, `style.css`, `app.js`, plus `supabase/schema.sql`. Ask me for the Supabase URL and anon key when you need them.

---

## Goal

A one-page, mobile-first, no-login website. Students order campus meals in another app and pick them up with a personal QR at lunch and dinner. If someone can't make it, the kitchen staff scan their QR and box the meal. This page replaces the group chat: it shows the staff whose QR to scan.

## Look

- White `#FFFFFF`, ink `#111111`, accent yellow `#FFD400`, muted text `#5C5C5C`, lines `#CFCFCF` / `#E6E6E6`.
- Fonts: Archivo (400–800) for UI, IBM Plex Mono 500 for small labels and counts (Google Fonts).
- Square corners, 2px black borders on key elements, touch targets ≥ 44px, inputs at 16px (stops iOS zoom).
- Layout max-width 560px, centred. Match `design/Main.dc.html` exactly.

## Screens and behaviour

1. **Header (sticky):** logo box + "Box Pasti"; on the right "Clears 15:00" (or 21:30).
2. **Current meal:** "Now collecting · 1 October" over a big "Thursday lunch".
3. **Search:** filters both lists by name.
4. **Two tabs:** "To box (n)" (default, yellow when active) and "Not boxed (n)".
   - **To box:** 2-column grid of cards: the person's QR image (tap → full-screen bottom sheet with a large QR), name, reason ("Every Thursday lunch" or "Added for this meal"), **Unbox** button, edit button.
   - **Not boxed:** rows with name, reason ("Weekly: Lunch Tue, Wed", "Weekly schedule paused", "No weekly schedule", "Skipping the box this time"), edit button, yellow **Box me** button.
5. **Sticky bottom button:** "Add your QR".
6. **Add / edit sheet (bottom sheet):** name; QR image upload (a screenshot from the meal app); "Box me every week" switch; Mon–Fri × Lunch/Dinner toggle grid (greyed out when the switch is off); Save, Cancel, and on edit "Remove me from the list". Adding requires a name and a QR.

## Meal and reset rules

- All time logic uses **Europe/Rome** time, whatever the phone's timezone.
- Before 15:00 → today's lunch. 15:00–21:30 → today's dinner. After 21:30 → tomorrow's lunch. Saturday/Sunday → Monday lunch.
- A person is on **To box** if:
  - they have an override for this meal, and it says `box`; or
  - with no override, weekly is on and the current day and meal are ticked.
- Box me / Unbox write an **override** keyed to the current meal (`2026-10-01-L`). The next meal has a new key, so the list resets on its own twice a day; no cron needed. If an override matches what the schedule already says, delete it instead.
- Optional: delete overrides older than 7 days when the page loads.

## Data (Supabase, free tier)

```
people(id uuid pk default gen_random_uuid(), name text not null,
       qr_url text, recurring boolean default false,
       schedule jsonb default '{}',   -- {"Mon":{"L":true,"D":false}, ...}
       created_at timestamptz default now())

overrides(service_key text, person_id uuid references people on delete cascade,
          state text check (state in ('box','unbox')),
          primary key (service_key, person_id))
```

- QR images: downscale in the browser to ~400px PNG before upload, store in a public Supabase Storage bucket `qr`, and save the URL in `people.qr_url`.
- Row Level Security on, with policies allowing the `anon` role to select/insert/update/delete. This is trust-based by design.
- Use Supabase Realtime on both tables so every open phone updates live.
- Seed data: the weekly schedule from the current PDF (in `SEED` inside `design/Main.dc.html`), but without QR images. People add their own.

## Deploy

Push to a GitHub repo → Settings → Pages → deploy from `main` / root. The Supabase anon key is safe to ship in client code; access is controlled by RLS.

## Trust note

Anyone with the link can see and scan every QR, and can edit any entry. Share the link only in the group chat. If that becomes a problem, add a shared group passcode later.
