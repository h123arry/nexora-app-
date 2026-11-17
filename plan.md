# Plan — Apply the Exact NEXORA Logo

## Approved mark
Use the exact newly uploaded 1920×1920 PNG as NEXORA’s official logo. Its black square background and glossy continuous ribbon N are part of the approved image. Do not redraw, vectorize, recolor, remove the background, regenerate, or apply extra filters. The only permitted derivatives are ordinary downscaled copies required for platform icon sizes.

## Implementation approach
Store the original uploaded image byte-for-byte at `assets/logo.png` as the Capacitor and PWA master. Use the existing `@capacitor/assets` pipeline to regenerate Android, iOS, and PWA icons and splash artwork against the existing black background. Publish the generated 512px mark at stable web paths and use the same artwork throughout shared app branding, loading UI, video watermark, post-roll, avatars, share cards, browser metadata, and push notifications. Update cache entries, favicon references, documentation, and branding checks so they point to existing generated PNG files and no longer use the flat vector N or former orbit logo.

## Project structure
- `assets/logo.png`: exact user-supplied master artwork for platform generation.
- `public/icons/`: generated size-specific PWA and browser icon assets.
- `public/nexora-mark.png` and `public/logo.png`: generated stable aliases for shared app branding and legacy notification URLs.
- `index.html`, `public/manifest.json`, and service workers: browser, PWA, social-preview, startup, and offline asset references.
- `src/components/NexoraPremiumLogo.tsx` and `NexoraBranding.tsx`: shared React logo/wordmark components, including the content watermark and post-roll card.
- `src/services/` and selected components: share-card artwork and fallback avatars.
- `functions/src/`: server-generated notification artwork paths.
- `android/app/src/main/res/` and `ios/App/App/Assets.xcassets/`: generated native launch and app-icon assets.
- `design/NEXORA-BRAND.md` and `tests/nexora-branding-assets.test.mjs`: canonical brand guidance and safeguards.

No product-flow, typography, backend, or Firebase project configuration changes are in scope.