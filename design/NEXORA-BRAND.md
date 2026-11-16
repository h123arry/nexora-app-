# NEXORA brand system

## Official mark

The founder-approved primary mark is the continuous ribbon-style capital **N** shown in the approved artwork on 16 November 2026. The canonical vector source is shared by the web app and native asset generator.

- `assets/logo.svg` — canonical source for Capacitor native and PWA icon/splash generation.
- `public/logo.svg` — canonical web mark, favicon, metadata and shared React branding.
- `src/components/NexoraPremiumLogo.tsx` — shared React mark used by brand lockups and watermarks.
- `src/components/NexoraBranding.tsx` — NEXORA wordmark and tagline lockup.
- `src/components/branding/NexoraWatermark.tsx` — content watermark.

The source SVGs must remain byte-for-byte identical. Do not reintroduce the former orbital mark or use an untracked raster as the source of truth.

## Native and PWA assets

The project uses `@capacitor/assets` (already in devDependencies) to generate platform-specific raster outputs from `assets/logo.svg`.

- `npm run mobile:assets` generates assets for all detected platforms.
- `npm run mobile:assets:android` generates Android launcher and splash assets.
- `npm run mobile:assets:ios` generates iOS AppIcon and launch assets.
- `npm run mobile:assets:pwa` generates PWA icons and updates the manifest.

The generator uses pure black (`#000000`) for light and dark icon/splash backgrounds so the app icon matches the approved artwork. Native CI runs the platform-specific generator before syncing and compiling. On pushes to `main`, the asset-generation job commits generated native and PWA outputs so the repository stays in sync with the canonical source.

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

The ribbon N replaces the former interlocking orbital mark. All shared web branding and watermark UI must reference `/logo.svg`. Native icons and launch assets must be generated from `assets/logo.svg`.
