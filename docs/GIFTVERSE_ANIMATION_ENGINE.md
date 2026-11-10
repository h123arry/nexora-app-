# GIFTVERSE animation engine

Phase 5.4 adds a shared, category-aware animation composition for catalogue previews and live gift arrivals.

## Animation families

- **Dragon Realm:** an entrance flight path, directional light trail, and layered orbital atmosphere.
- **Wild Kingdom:** a multi-beat approach with a walking-style step rhythm and ground contact glow.
- **Floral Garden:** a bloom reveal with unfolding petal layers and a slow orbit.
- **Royal Dominion and Luxe Atelier:** a descending reveal with a restrained prestige halo.
- **Celestial Worlds and Future & Innovation:** a rotating reveal with orbit rings.
- **Music & Celebration:** a rhythmic pulse.
- **Other worlds:** a polished arrival with particles and rarity-aware atmosphere.

The animation profile is derived from the trusted gift ID and catalogue animation tier. The live renderer uses that profile to align its display lifetime with the visual sequence. Legendary and cinematic tiers receive a larger, longer-lived visual treatment.

## Where it is used

- Live gift deliveries render through `GiftLiveOverlay` and `GiftAnimationStage`.
- The selected gift preview in GIFTVERSE uses the same stage, so the preview reflects the delivery choreography.
- Creator gift galleries continue to use their static bundled artwork. Receiving a gift does not cause a gallery animation to replay.

## Accessibility and performance

- The stage honors both the app's reduced-motion preference and the operating-system reduced-motion preference.
- Decorative layers are CSS-only and use a bounded particle count (5–16).
- Gift artwork remains bundled locally; the animation engine does not fetch remote animation assets.
- The stage is composed only while a preview or live gift is visible. It does not animate all catalogue cards continuously.

## Honest capability boundary

This phase adds category choreography, layered visual effects, motion timing, and shared preview/live rendering around the existing original SVG artwork. It does **not** claim to add skeletal character rigs, frame-by-frame character animation, 3D models, or cinematic video assets. Those require separately authored character artwork/animation assets. The current dragon flight and wildlife walk are composed motion effects around the bundled artwork, not independently articulated wing or leg animation.


## Phase 2 interaction-library hardening

The shared gift stage now observes its own viewport intersection and the document visibility state. Decorative choreography pauses when the stage leaves the viewport or the tab is backgrounded, and resumes when it becomes visible again. The observer is disconnected on unmount; browsers without IntersectionObserver retain the safe visible default.

The reaction picker and branded loader also use Motion's reduced-motion preference hook so JavaScript-driven transitions do not bypass the operating-system accessibility setting. The existing global CSS reduced-motion rules remain a second layer, not the only protection.

This tranche improves lifecycle and accessibility behaviour in existing product surfaces. It does not add remote animation downloads, autoplay sound, or claim new 3D/rigged artwork.
