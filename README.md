# Autoplay Killer

Global autoplay blocker for Chrome (MV3). One click turns it **ON** and pauses all videos/audios across open tabs; keeps future autoplay from starting.

## Features
- One-click **global** ON/OFF (badge shows **ON** when active)
- Instantly pauses media in all open tabs when enabled
- Prevents re-autoplay via document_start hooks + MutationObserver
- Lightweight + privacy-friendly (no tracking, no network calls)

## Install (Dev)
1) Go to `chrome://extensions` → turn **Developer mode** ON  
2) **Load unpacked** → select this folder  
3) Pin the extension → click icon to toggle

## Files
- `manifest.json` (MV3)
- `service_worker.js` (global toggle, badge, pause-all)
- `content.js` (disable autoplay at document_start)
- `icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
- `store-assets/promo_small_440x280.png`, `promo_marquee_1400x560.png`

## Permissions (why)
- `storage` – save global ON/OFF
- `scripting`, `tabs` – pause media across open tabs, set badge
- content script on `<all_urls>` – run at `document_start` to stop autoplay