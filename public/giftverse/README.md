# NEXORA GIFTVERSE artwork

The directory `gifts/` contains 120 individually bundled SVG artworks, one for each server-owned catalogue gift. Every image has a stable gift ID, accessible display title, description and a 256 × 256 viewBox.

Artwork colour tokens are validated as real SVG colours. Each collection has its own visual palette (floral, royal, dragon, wildlife, love, celestial, African heritage, fantasy, music, luxury, technology and seasonal).

The catalogue stores the canonical image path, NEX price, rarity and animation profile. The app loads the individual image for each card and preview. Animation profile metadata prepares the assets for Phase 5.4's real delivery renderer; it does not itself activate cinematic playback.

NEX prices remain server-owned. Phase 5.2 supports browsing and secure price quotes only. Sending, charging, creator earnings and withdrawals are later phases.

## Expanding GiftVerse with licensed source artwork

New online artwork must be licensed for commercial adaptation and must pass the rights policy in [ARTWORK_RIGHTS.md](./ARTWORK_RIGHTS.md). The import pipeline in `scripts/giftverse/import-artwork.mjs` sanitizes SVG source, requires creator/source/licence/modification metadata, enforces share-alike handling and emits a provenance register. Imported files must then be added to the canonical server catalogue and covered by tests before release.

Example import command:

```sh
node scripts/giftverse/import-artwork.mjs \
  --manifest ./giftverse-import/manifest.json \
  --input-dir ./giftverse-import/source \
  --output-dir ./public/giftverse/gifts \
  --provenance ./public/giftverse/provenance/imported-artwork.json
```

A successful import is not a catalogue release by itself. Every gift must have a unique identity, image path, accessible title, category, rarity, NEX price and original description. Rights review is mandatory before the artwork is published.

The individual SVGs are standalone vector artwork extracted from the original 120-symbol GIFTVERSE sprite already in the repository. Separate generated PNG references discussed in chat were not available as retrievable files during that earlier repository operation.
