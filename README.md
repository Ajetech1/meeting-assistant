# KidzTech Meeting Assistant v2.0 — Android PWA

This version replaces v1.0's dashboard-HTML extraction with the weekly schedule JSON endpoint:

`https://portal.kidztech.edubeta.net.ng/tutor/schedule/today`

## What changed in v2.0

- Reads `title`, `total_classes`, and every object in `classes[]`.
- Maps the API fields `student`, `date`, `time`, `duration`, `status`, and `meet_link`.
- Groups classes by date and provides All days, Today only, and Today + upcoming filters.
- Shows total classes, today's class count, and a next-class countdown.
- Validates Google Meet URLs before showing the Join Meet link.
- Refreshes on demand and on app launch.
- Supports importing a saved JSON response if the live endpoint is temporarily inaccessible.
- Installable as an Android PWA.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the Vite URL in a browser. For Android installation and service-worker testing, use HTTPS (or localhost during development).

## Deploy

Run `npm run build` and deploy the contents of `dist/` to an HTTPS static host. Configure the host to serve `index.html` for the app root. Keep `manifest.webmanifest`, `sw.js`, and the `icons` directory at the site root.

## Critical portal authentication / CORS requirement

The app calls the endpoint with `credentials: 'include'`, so it expects the tutor to already be signed in to the KidzTech portal in the same browser profile. It does not ask for or store portal passwords, cookies, or CSRF tokens.

If this PWA is hosted on a different origin (different scheme, host, or port) from `portal.kidztech.edubeta.net.ng`, the portal server must explicitly allow the PWA origin through CORS and allow credentialed requests. The response must include an exact `Access-Control-Allow-Origin` value (not `*`) and `Access-Control-Allow-Credentials: true`; the server must also handle the preflight if required. If the portal does not permit this, a static PWA on another domain cannot read the endpoint directly. In that case, host the PWA on the portal origin or add a secure same-origin server-side proxy under the portal's control. Do not try to work around browser security by copying session cookies into JavaScript.

If the API redirects to the login page, returns HTML instead of JSON, or returns 401/403, the app shows a clear connection/session message. Sign in to the portal and refresh.

## Android install

1. Deploy the app to an HTTPS URL.
2. Open that URL in Chrome on Android, using the same Chrome profile in which the tutor is signed in to the KidzTech portal.
3. Use Chrome's menu → **Install app** or **Add to Home screen**.
4. Open the installed app and tap Refresh.

## Reminder limitation

The optional five-minute reminder works while the PWA page is open and running, after notification permission is granted. Android may suspend or stop a PWA in the background; this release does not promise scheduled notifications after the app is closed. Reliable closed-app notifications require a backend Web Push service (VAPID subscription endpoint and server-side scheduler).

## Attendance and joining

Join Meet opens the supplied Google Meet URL in a new tab/window. Google Meet may still require the tutor to tap Join or request access. Opening a link is not proof of attendance. The app does not submit attendance, mark a class held/not held, or automate portal forms.

## API response expected

```json
{
  "title": "This Week's Classes",
  "total_classes": 12,
  "classes": [
    {
      "student": "Sisian Etukudo",
      "date": "Sunday, Nov 08, 2026",
      "time": "6:00 PM",
      "duration": "1 hr 30 min",
      "status": null,
      "meet_link": "https://meet.google.com/sov-cuew-evt"
    }
  ]
}
```

The example above is illustrative; the app reads the complete array returned by the live endpoint.
