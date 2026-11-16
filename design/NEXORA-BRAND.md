# NEXORA brand system

## Official mark

The approved primary mark is the continuous ribbon-style capital **N** supplied by the founder on 16 November 2026. It is rendered in a luminous gradient that moves from magenta through electric violet and royal blue into cyan, on a pure black field.

- `public/logo.svg` — canonical scalable brand mark, favicon and web/PWA identity.
- `assets/logo.svg` — source asset mirror.
- `src/components/NexoraPremiumLogo.tsx` — shared React mark component used by branding and watermark components.
- `public/logo.png` — legacy raster asset; do not use for new UI. Regenerate from the canonical mark when native raster exports are produced.
- Android adaptive icon: `mipmap-anydpi-v26/ic_launcher.xml` with `drawable-v24/ic_launcher_foreground.xml`.
- Android legacy launcher and splash resources should be generated from the canonical mark before publishing a native build.
- iOS AppIcon and Splash asset-catalog PNGs must be regenerated from the canonical mark before publishing an iOS build.

## Palette

- Background: `#000000`
- Magenta highlight: `#F044E8`
- Electric violet: `#8B20FF`
- Royal blue: `#174BFF`
- Cyan highlight: `#00E5F2`
- Wordmark text: `#FFFFFF`

## Usage

Use the official mark without redrawing, distorting, rotating, recolouring, or adding effects to the symbol itself. Preserve generous clear space. The black field is part of the approved app-icon treatment. Pair the mark with the NEXORA wordmark in Plus Jakarta Sans and the tagline “The World's Living Social Network”.

## Brand migration note

The ribbon N replaces the former interlocking orbital mark. All shared web branding and watermark UI must reference `/logo.svg`; do not reintroduce the old orbital design.
