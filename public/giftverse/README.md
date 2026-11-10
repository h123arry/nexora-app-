# NEXORA GIFTVERSE artwork

GiftVerse now contains 1,000 distinct gift identities: 120 original bundled SVG artworks plus 880 individually referenced Twemoji SVG illustrations. Each catalogue entry has a unique gift ID, name, image reference, NEX price, rarity, category, animation profile and description.

The 880 source images are pinned to Twemoji v15.1.0 commit `7407fa31c51be5ab45626b8ab5554d50cc8073f6` and loaded by the live catalogue from fixed upstream SVG URLs. Their source artwork is licensed CC BY 4.0. NEXORA adds its own collectible identity, midnight-violet presentation frame, rarity treatment and animation composition. The source artwork is not claimed as exclusively owned by NEXORA.

The 120 original GiftVerse SVGs remain bundled locally. The 880 Twemoji source files are currently pinned remote assets rather than locally vendored files. This is an explicit limitation: the 880 images require network access. The licensed importer provides the path to bundle and sanitize them in a later offline-vendoring pass.

## Attribution

All emojis designed by Twemoji, the open-source emoji project. Graphics licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Source: https://github.com/jdecked/twemoji. Licence: https://creativecommons.org/licenses/by/4.0/. Per-image provenance: `provenance/twemoji-v15.1.0.json`.

See [ARTWORK_RIGHTS.md](./ARTWORK_RIGHTS.md) and [TWEMOJI_ATTRIBUTION.md](./TWEMOJI_ATTRIBUTION.md).
