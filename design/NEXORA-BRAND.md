# NEXORA brand system

## Official logo

The official NEXORA logo is the exact founder-supplied square PNG at `assets/logo.png`: a glossy continuous ribbon capital N on a black background, with a vivid purple-to-blue-to-cyan gradient. The black square and the full N composition are part of the artwork.

Do not redraw, vectorize, recolor, crop, remove the background, or add filters to the logo. The only permitted derivatives are direct size reductions needed for browser, PWA, Android, iOS, notification, and in-app display requirements. All derivatives must retain the original composition and black background.

## Production assets

- `assets/logo.png` — byte-for-byte user-supplied source image; canonical input to asset generation.
- `public/icons/icon-48.png` through `public/icons/icon-512.png` — generated PWA/browser size variants.
- `public/nexora-mark.png` and `public/logo.png` — stable 512px aliases generated from `public/icons/icon-512.png` for app UI and legacy notification URLs.
- `src/components/NexoraPremiumLogo.tsx` — shared app logo used by wordmark lockups and loading UI.
- `src/components/NexoraBranding.tsx` — NEXORA wordmark and tagline lockup.
- `src/components/branding/NexoraWatermark.tsx` — content watermark.

## Native and PWA assets

The project uses the existing `@capacitor/assets` pipeline with `assets/logo.png` as its sole logo master.

- `npm run mobile:assets` regenerates Android, iOS, and PWA assets.
- `npm run mobile:assets:android` generates Android launcher and splash assets.
- `npm run mobile:assets:ios` generates iOS app-icon and launch assets.
- `npm run mobile:assets:pwa` generates PWA icons, normalizes them into `public/icons/`, updates the manifest, and refreshes the stable PNG aliases.

The source artwork already has a black background; native and PWA output backgrounds are black as well. Keep the exact source in Git and regenerate derived assets after any approved logo change.

## Usage

Preserve the uploaded artwork exactly. Use it consistently for the app, browser, PWA, native app icons, splash screens, notifications, fallback avatars, share cards, and video branding. Pair the image with the existing NEXORA wordmark in Plus Jakarta Sans and the tagline “The World's Living Social Network”.

## Brand migration note

This exact glossy ribbon N replaces the flat vector N and any legacy orbit mark. All active brand references must use assets generated from `assets/logo.png`.
