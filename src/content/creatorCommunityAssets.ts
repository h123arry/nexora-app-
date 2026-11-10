export type CreatorAssetCategory = 'profile-frame' | 'profile-badge' | 'circle-cover' | 'milestone-art' | 'live-overlay';
export interface CreatorCommunityAsset { id: string; title: string; category: CreatorAssetCategory; rarity: 'standard' | 'rare' | 'epic' | 'legendary'; path: string; description: string; aspectRatio: '1:1' | '16:9'; applyField?: 'profileFrameId' | 'profileBadgeId'; }
export const CREATOR_COMMUNITY_ASSETS: CreatorCommunityAsset[] = [
  {
    "id": "frame-aurora",
    "title": "Aurora Halo",
    "category": "profile-frame",
    "rarity": "rare",
    "path": "/creator-assets/profile-frames/frame-aurora.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-regalia",
    "title": "Imperial Filigree",
    "category": "profile-frame",
    "rarity": "epic",
    "path": "/creator-assets/profile-frames/frame-regalia.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-eclipse",
    "title": "Eclipse Ring",
    "category": "profile-frame",
    "rarity": "rare",
    "path": "/creator-assets/profile-frames/frame-eclipse.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-royal",
    "title": "Royal Lattice",
    "category": "profile-frame",
    "rarity": "rare",
    "path": "/creator-assets/profile-frames/frame-royal.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-obsidian",
    "title": "Obsidian Orbit",
    "category": "profile-frame",
    "rarity": "rare",
    "path": "/creator-assets/profile-frames/frame-obsidian.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-solstice",
    "title": "Golden Solstice",
    "category": "profile-frame",
    "rarity": "epic",
    "path": "/creator-assets/profile-frames/frame-solstice.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-starlight",
    "title": "Starlight Crest",
    "category": "profile-frame",
    "rarity": "rare",
    "path": "/creator-assets/profile-frames/frame-starlight.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "frame-nocturne",
    "title": "Nocturne Halo",
    "category": "profile-frame",
    "rarity": "rare",
    "path": "/creator-assets/profile-frames/frame-nocturne.svg",
    "description": "A transparent decorative frame designed to sit around a profile portrait.",
    "aspectRatio": "1:1",
    "applyField": "profileFrameId"
  },
  {
    "id": "badge-aurora",
    "title": "Aurora Mark",
    "category": "profile-badge",
    "rarity": "rare",
    "path": "/creator-assets/badges/badge-aurora.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-regalia",
    "title": "Regalia Seal",
    "category": "profile-badge",
    "rarity": "epic",
    "path": "/creator-assets/badges/badge-regalia.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-eclipse",
    "title": "Eclipse Star",
    "category": "profile-badge",
    "rarity": "rare",
    "path": "/creator-assets/badges/badge-eclipse.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-royal",
    "title": "Royal Shield",
    "category": "profile-badge",
    "rarity": "rare",
    "path": "/creator-assets/badges/badge-royal.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-obsidian",
    "title": "Obsidian Crest",
    "category": "profile-badge",
    "rarity": "rare",
    "path": "/creator-assets/badges/badge-obsidian.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-solstice",
    "title": "Solstice Laurel",
    "category": "profile-badge",
    "rarity": "epic",
    "path": "/creator-assets/badges/badge-solstice.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-starlight",
    "title": "Starlight Medal",
    "category": "profile-badge",
    "rarity": "rare",
    "path": "/creator-assets/badges/badge-starlight.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "badge-nocturne",
    "title": "Nocturne Insignia",
    "category": "profile-badge",
    "rarity": "rare",
    "path": "/creator-assets/badges/badge-nocturne.svg",
    "description": "A creator identity emblem for recognition beside your public profile name.",
    "aspectRatio": "1:1",
    "applyField": "profileBadgeId"
  },
  {
    "id": "circle-aurora",
    "title": "Aurora Current",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-aurora.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-regalia",
    "title": "Regalia Hall",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-regalia.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-eclipse",
    "title": "Eclipse Summit",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-eclipse.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-royal",
    "title": "Royal Observatory",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-royal.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-obsidian",
    "title": "Obsidian Gallery",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-obsidian.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-solstice",
    "title": "Solstice Garden",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-solstice.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-starlight",
    "title": "Starlight Forum",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-starlight.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "circle-nocturne",
    "title": "Nocturne District",
    "category": "circle-cover",
    "rarity": "standard",
    "path": "/creator-assets/circle-covers/circle-nocturne.svg",
    "description": "A community cover illustration with a deep midnight canvas and violet detail.",
    "aspectRatio": "16:9"
  },
  {
    "id": "milestone-aurora",
    "title": "First Light",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-aurora.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-regalia",
    "title": "Rising Creator",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-regalia.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-eclipse",
    "title": "Community Builder",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-eclipse.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-royal",
    "title": "Creative Streak",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-royal.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-obsidian",
    "title": "Audience Spark",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-obsidian.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-solstice",
    "title": "Trusted Voice",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-solstice.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-starlight",
    "title": "Storyteller",
    "category": "milestone-art",
    "rarity": "rare",
    "path": "/creator-assets/milestones/milestone-starlight.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "milestone-nocturne",
    "title": "Nexora Pioneer",
    "category": "milestone-art",
    "rarity": "legendary",
    "path": "/creator-assets/milestones/milestone-nocturne.svg",
    "description": "Achievement artwork for creator milestones and community recognition.",
    "aspectRatio": "1:1"
  },
  {
    "id": "overlay-aurora",
    "title": "Aurora Broadcast",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-aurora.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-regalia",
    "title": "Regalia Stage",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-regalia.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-eclipse",
    "title": "Eclipse Frame",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-eclipse.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-royal",
    "title": "Royal Live",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-royal.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-obsidian",
    "title": "Obsidian Session",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-obsidian.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-solstice",
    "title": "Solstice Event",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-solstice.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-starlight",
    "title": "Starlight Premiere",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-starlight.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  },
  {
    "id": "overlay-nocturne",
    "title": "Nocturne Stream",
    "category": "live-overlay",
    "rarity": "rare",
    "path": "/creator-assets/live-overlays/overlay-nocturne.svg",
    "description": "A transparent 16:9 frame overlay for live sessions, premieres and events.",
    "aspectRatio": "16:9"
  }
];
export const getCreatorCommunityAsset = (id?: string | null) => CREATOR_COMMUNITY_ASSETS.find(asset => asset.id === id) || null;
export const getCreatorCommunityAssets = (category?: CreatorAssetCategory) => category ? CREATOR_COMMUNITY_ASSETS.filter(asset => asset.category === category) : CREATOR_COMMUNITY_ASSETS;
