# Phase 4 — Creator and Community Asset Library

## Catalogue
This phase adds 40 original NEXORA vector artworks, organised as five collections of eight:
- Profile frames: transparent portrait frames designed to overlay a user's avatar.
- Creator badges: public identity emblems.
- Circle covers: 16:9 community cover illustrations.
- Milestone artwork: creator achievement and recognition illustrations.
- Live overlays: transparent 16:9 broadcast frames for live sessions and events.

The assets are authored as local SVGs. No remote image dependency, third-party stock licence or runtime image-generation request is required. SVGs are scalable, cacheable and substantially lighter than equivalent raster artwork.

## Product integration
- Creator Studio gains a searchable Asset Library tab.
- Profile frames and badges can be applied to the signed-in creator's profile.
- Profile decoration IDs are constrained to the bundled catalogue and are added to the public profile projection.
- ProfileView renders the selected frame around the portrait and the selected badge beside the profile name.
- Circle creation can select a bundled cover instead of relying on an inferred external Unsplash image.
- All catalogue items can be downloaded; non-profile assets expose a local asset link for reuse in event and production workflows.

## Security and data
Profile decoration fields are optional and only editable by the account owner through existing profile update paths. Firestore public profile allowlists include only the two validated string identifiers. The frontend only accepts IDs present in the static catalogue. No arbitrary remote image URL is stored in the decoration fields.

## Verification
The catalogue test checks unique IDs, all five category counts, safe local paths and the limited profile-application surface. Existing profile, Circle and Firebase rules suites remain part of the repository CI gate.

## Asset policy
Artwork is original NEXORA vector design. The collection deliberately uses a restrained midnight/violet identity with gold and pale-lavender accents. The assets are delivered as production-ready SVG source rather than placeholder gradients or remote image hotlinks.
