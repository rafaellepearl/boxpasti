# Box Pasti

A one-page list that shows the kitchen whose meal QR to scan and box at each lunch and dinner.
Students who can't make it to the canteen add themselves, and the kitchen ticks them off as they box.
It's a static site on GitHub Pages, with the shared data in Supabase (free tier). There's no login.

The page is in **Italian by default**. The **IT / EN** switch next to the date changes it to English, and each phone remembers the choice.

<p>
  <img src="docs/screenshots/to-box.png" width="200" alt="Box da fare list for Thursday lunch, with a 6 di 10 pronti progress bar and a Segna tutti pronti button">
  <img src="docs/screenshots/boxed.png" width="200" alt="Cards still to box above green cards the kitchen has marked as Pronto">
  <img src="docs/screenshots/qr.png" width="200" alt="An enlarged QR with Segna pronto and Chiudi buttons">
</p>
<p>
  <img src="docs/screenshots/not-boxed.png" width="200" alt="Senza box list with Fammi il box buttons">
  <img src="docs/screenshots/edit.png" width="200" alt="Edit sheet with name, QR upload and a weekly Monday to Friday schedule grid">
</p>

<sub>Screenshots use made-up people and fake QR codes.</sub>

```
index.html                page
style.css                 styles
app.js                    logic, plus all Italian and English text in STRINGS (Supabase URL and key at the top)
supabase/schema.sql       tables, security policies, Realtime, QR storage bucket
docs/screenshots/         images for this README
```

## How it works

Button names are shown in Italian, with the English version in brackets.

**For students**

- **Aggiungi il tuo QR** (Add your QR) once: your name, a screenshot of the QR from the meal app, and, if you like, the meals you always miss each week.
- **Fammi il box** (Box me) or **Niente box** (Unbox) changes only the current meal. For example, pressing it on Thursday lunch doesn't touch Friday.

**For the kitchen**

- **Box da fare** (To box) shows everyone whose meal needs boxing right now. Tap a QR to enlarge it for scanning.
- Tap **Segna pronto** (Mark boxed) on a card when it's done, or **Segna tutti pronti** (Mark all boxed) at the top once you've finished the batch.
  Done cards turn green, show a "Pronto" stamp and move to the bottom. The bar at the top counts how many are done.
- If someone adds themselves after that, their card appears at the top without the green, so it's easy to spot.
  Tap **✓ Pronto** on a card to undo it.

**Rules**

- Rome time decides the meal: lunch before 15:00, dinner until 21:30, then the next day's lunch. Weekends show Monday lunch.
- Overrides (box / no box for one meal) and kitchen marks are saved for one meal only, keyed like `2026-10-01-L`.
  Each meal has a new key, so the list resets by itself twice a day. Rows older than 7 days are deleted when someone opens the page.
- When someone uploads a screenshot, the page finds the QR in it, crops it, shrinks it to 400px and saves it as a PNG.
- Every open phone updates live through Supabase Realtime.

## Changing the wording

All visible text lives in `STRINGS` at the top of `app.js`, with an `it` and an `en` block that have the same keys.
Edit a value there and both the page and the switch pick it up.
