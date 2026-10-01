# Operations

How to run, change and look after Box Pasti. For what the app does, see [README.md](README.md).

| What | Where |
|---|---|
| Live site | https://rafaellepearl.github.io/boxpasti/ (kitchen mode: `#cucina`) |
| Code | https://github.com/rafaellepearl/boxpasti |
| Database, storage, keys | Supabase project `fmzimevpuzaodixruvzb` → https://supabase.com/dashboard/project/fmzimevpuzaodixruvzb |

## Run it locally

```bash
python -m http.server 8080
```

Open http://localhost:8080. It uses the live database, so be careful what you change.

- **Another meal:** add `?at=2026-10-01T16:00` to see that Rome time.
- **Demo mode** (made-up people, saved only in your browser): temporarily empty `SUPABASE_ANON_KEY` in `app.js`. Don't commit that.

## Deploy

Push to `main`. The **Deploy site** workflow (`.github/workflows/deploy.yml`) publishes `index.html`, `app.js` and `style.css` to GitHub Pages within about a minute.

- **One-time setting:** repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- **Build stamp:** the workflow replaces `__VERSION__` in `index.html` and `app.js` with the commit id. Phones cache each file for 10 minutes. If a phone ends up with a page and a script from different deploys, the script notices and reloads once. Leave `__VERSION__` as it is in the source.
- **Nothing else is published.** README, `docs/` and `supabase/` stay in the repo only.

## Change the database

There is no automatic migration. `supabase/schema.sql` is the source of truth and is safe to run again; it never deletes data.

1. Edit `supabase/schema.sql` and commit it.
2. Open **SQL Editor → New query**, paste the whole file and click **Run**.
3. Check **Advisors → Security** for warnings.

**Pending:** the QR bucket's 512 KB file limit in `schema.sql` hasn't been applied to the live project yet, which is still at 2 MB. Run the file once to catch up.

## If something breaks

| Symptom | Fix |
|---|---|
| "Impossibile caricare la lista" for everyone | The Supabase project is probably paused. Dashboard → **Restore project**. Data is kept. |
| The **Keep Supabase awake** workflow failed (GitHub emails you) | Same: the project paused or is down. Restore it, then run the workflow again from the **Actions** tab. |
| Old version still showing after a push | Wait 10 minutes (phone cache), or check the **Actions** tab for a failed deploy. |
| Someone vandalised the list | Access is open by design and there's no backup on the free plan. Re-add people, or re-run `supabase/seed.local.sql` (local only) after emptying `people`. The real fix is the group passcode. |

**Scheduled workflows:** GitHub turns them off after 60 days without any commit. If the keep-awake job stops, re-enable it in the **Actions** tab.

## Keys

The publishable key in `app.js` is meant to be public: what it can do is controlled by the database's Row Level Security, not by keeping it hidden. To replace it:

1. Supabase → **Project Settings → API Keys** → create a new publishable key.
2. Put it in `SUPABASE_ANON_KEY` in `app.js` and push.
3. After the deploy, disable the old key.

Never put the `service_role` or secret key in the code.

## Updating the libraries

`supabase-js` and `jsQR` load from jsDelivr, pinned to exact versions and with integrity hashes. If the file ever changes, the browser refuses it. To upgrade:

1. Change the version in the URL (`index.html` for supabase-js, `JSQR_SRC` in `app.js` for jsQR).
2. Compute the new hash and put it in `integrity` / `JSQR_SRI`:
   ```bash
   curl -sL "<script URL>" | openssl dgst -sha384 -binary | openssl base64 -A
   ```
3. Test locally, then push.

## Kept out of the repo

The PDF with everyone's QR codes, `supabase/seed.local.sql` (real names), `Main.dc.html` (the original design prototype, also with real names) and local tool settings. See `.gitignore`.
