# NEXORA GIFTVERSE artwork

GiftVerse ships 1,000 distinct catalogue gifts: the original 120 NEXORA vector artworks plus 880 individually identified OpenMoji-based adaptations. The 880 source illustrations are embedded as 880 separately addressable SVG symbols across eight optimized sprite files. Every catalogue entry has its own stable image reference, name, description, category, rarity and server-owned NEX price.

The sprite approach avoids 880 separate network requests while preserving independent vector artwork references. Live deliveries use the shared animation stage; gallery artwork remains static.

## Licensed artwork

The 880 imported source illustrations are from OpenMoji 17.0.0 and are licensed CC BY-SA 4.0. Each item has a source URL, original creator, source hexcode, licence and modification record in provenance/openmoji-17.0.0.json. See OPENMOJI_ATTRIBUTION.md and ARTWORK_RIGHTS.md.

Adaptations add NEXORA-specific midnight-violet medallions, category palettes, luminous rims, decorative details and accessible titles. The adapted artwork remains subject to share-alike requirements; NEXORA does not claim exclusive copyright over the underlying source artwork.

Run npm run giftverse:import-openmoji to rebuild the pinned, deterministic expansion. The generator rejects duplicate source hexcodes, excludes selected sensitive or unsuitable categories, sanitizes SVG content and verifies exactly 880 source illustrations.
