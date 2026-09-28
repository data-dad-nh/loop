# Loop

A calm, mobile-first task and communication tracker, built for how ADHD
brains actually work: low-friction capture, one task at a time, visible
time instead of numbers, and a communication log so calls/texts/emails
don't fall out of working memory.

Works fully offline-first on a single device out of the box — no signup,
no config. Two things are optional upgrades, both free:

- **Gemini API key** → turns quick-capture text into structured tasks,
  breaks a vague task into steps, and pulls action items out of comm log
  entries.
- **Firebase project** → syncs your data across devices and enables push
  notifications.

## Features

- **Now** — one task at a time, with an AI-powered "break it down" for
  anything too vague to start on
- **Tasks** — full list grouped by Overdue / Today / No date / Upcoming,
  plus a visual timeline strip of today so time isn't just a number
- **Focus** — a body-doubling-style focus timer with a streak counter
  that never resets to zero on a missed day
- **Log** — a communication log (call/text/email/other) linked to people
  and tasks, with AI-extracted action items you can promote into tasks
  with one tap

## Local setup

```bash
npm install
cp .env.example .env   # optional — fill in keys if you want AI/sync
npm run dev
```

## Getting a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Create a key (no billing required for the free tier)
3. Put it in `.env` as `VITE_GEMINI_API_KEY`

## Setting up Firebase (optional — sync + push)

1. Go to https://console.firebase.google.com, create a project
2. Add a **Web App** inside it, copy the config values into `.env`
3. In the Firebase console, enable **Firestore Database** (start in test
   mode, then lock down rules once it's just you — see note below)
4. For push notifications: Project settings → Cloud Messaging → generate
   a **Web Push certificate (VAPID key)**. Wiring the VAPID key into a
   subscribe flow is the next piece to build on top of this — the service
   worker (`public/sw.js`) already has a `push` handler ready for it.

**Firestore security rules**: test mode is open to anyone with your
project ID, which is fine for a few days of local dev but not for a
deployed app. Since this is a single-user personal project with no
auth, the simplest lock-down is to restrict rules to a shared secret
path or add Firebase Anonymous Auth — worth doing before you rely on
this daily.

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds and deploys automatically on every push to `main` — the same
pattern as the Farkle project.

1. Update `REPO_NAME` in `vite.config.js` to match whatever you name the
   GitHub repository
2. Push this project to a new GitHub repo
3. In the repo's Settings → Pages, set **Source** to "GitHub Actions"
4. If you want the deployed build to have AI/sync enabled, add your
   `.env` values as repo secrets under Settings → Secrets and variables →
   Actions (names must match exactly, e.g. `VITE_GEMINI_API_KEY`)
5. Push to `main` — the app will be live at
   `https://<your-username>.github.io/<REPO_NAME>/`

## Notes on what's intentionally simple right now

- **Icons**: `manifest.json` references `icon-192.png` / `icon-512.png`
  in `public/` — add your own (any square PNG works) so "Add to Home
  Screen" gets a real icon instead of a blank one.
- **Push notifications** work today for in-app nudges (5 minutes before a
  dated task, focus session complete) while the app is open in a tab.
  Delivery when the app is fully closed needs the FCM subscribe flow
  described above — a good next feature to add.
- **Bundle size**: the Firebase SDK is included in the build whether or
  not you configure it (~700 KB before gzip). Fine for personal use; if
  you want a leaner bundle when running local-only, switch the imports
  in `firebase.js` / `firestoreSync.js` to dynamic `import()`s gated on
  `firebaseEnabled`.
- **API keys are visible client-side.** GitHub Pages is static hosting,
  so anything in `.env` ends up in the shipped JS bundle. Fine for a
  personal project only you use; if that ever changes, put a small
  serverless proxy (e.g. a Cloudflare Worker) in front of the Gemini
  calls instead of calling it directly from the browser.
