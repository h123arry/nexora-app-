# NEXORA brand system

## Official mark

The founder-approved primary mark is the continuous ribbon-style capital **N** shown in the approved artwork on 16 November 2026. The canonical vector source is shared by the web app and native asset generator.

- `assets/logo.svg` — canonical source for Capacitor native and PWA icon/splash generation.
- `public/nexora-mark.svg` — stable public web mark URL for favicon, metadata, startup screen and shared React branding. (`capacitor-assets` removes `/logo.svg` when generating PWA icons, so the public URL intentionally uses a different filename.)
- `src/components/NexoraPremiumLogo.tsx` — shared React mark used by brand lockups and watermarks.
- `src/components/NexoraBranding.tsx` — NEXORA wordmark and tagline lockup.
- `src/components/branding/NexoraWatermark.tsx` — content watermark.

The source SVGs must remain byte-for-byte identical. Do not reintroduce the former orbital mark or use an untracked raster as the source of truth.

## Native and PWA assets

The project uses `@capacitor/assets` (already in devDependencies) to generate platform-specific raster outputs from `assets/logo.svg`.

- `npm run mobile:assets` explicitly generates Android, iOS and PWA assets in sequence.
- `npm run mobile:assets:android` generates Android launcher and splash assets.
- `npm run mobile:assets:ios` generates iOS AppIcon and launch assets.
- `npm run mobile:assets:pwa` generates PWA icons and updates the manifest, including the `public/icons/` icon set.

The generator uses pure black (`#000000`) for light and dark icon/splash backgrounds so the app icon matches the approved artwork. A post-generation normalizer moves PWA outputs into `public/icons/`, corrects PNG file extensions and manifest MIME types, and restores the stable public SVG mark. Native CI runs the platform-specific generator before syncing and compiling. The main CI suite also runs `npm run test:branding`, which checks that the canonical SVG copies match, shared React branding uses `/logo.svg`, and native generation remains wired into CI. On pushes to `main`, the asset-generation job commits generated native and PWA outputs so the repository stays in sync with the canonical source.

After changing the canonical SVG, run `npm run mobile:assets` and inspect generated outputs on iOS and Android before release.

## Palette

- Background: `#000000`
- Magenta highlight: `#F044E8`
- Electric violet: `#8B20FF`
- Royal blue: `#174BFF`
- Cyan highlight: `#00E5F2`
- Wordmark text: `#FFFFFF`

## Usage

Use the official mark without redrawing, distorting, rotating, recolouring, or adding effects to the symbol itself. Preserve generous clear space. Pair the mark with the NEXORA wordmark in Plus Jakarta Sans and the tagline “The World's Living Social Network”.

## Brand migration note

The ribbon N replaces the former interlocking orbital mark. All shared web branding and watermark UI must reference `/nexora-mark.svg`. Native icons and launch assets must be generated from `assets/logo.svg`.
