# Nexora CapCut Auto-Cut Engine & Modern Button Refinement

Implement a TikTok/CapCut-style "Auto-Cut" video editing studio alongside a comprehensive modernization of all application buttons (including the share button) using sleek glassmorphism pill styling and glowing cyberpunk neon gradients.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your selections, we will integrate a comprehensive Auto-Cut engine and upgrade all app buttons to modern glassmorphic pill and glowing neon gradient designs.

- **CapCut Auto-Cut Engine**:
  - Beat-synced automatic montage cuts with dynamic trim pacing.
  - AI smart highlight extraction identifying motion and speech peaks.
  - Template-based cinematic auto-edit presets (Cyberpunk, Cinematic, Lo-Fi, Fast-Paced TikTok).
- **Modern Button Refinement**:
  - Sleek glassmorphism pill buttons (`rounded-full backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/15`).
  - Glowing cyberpunk neon gradient buttons (`bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]`).
  - Specially polished Share Button with multi-platform quick share actions.

---

## 1. Overview & Core Concept

- **Auto-Cut Studio**: Empowers creators to drop raw video clips and instantly generate fully edited, beat-synced, captioned montages with AI templates.
- **Button System Upgrade**: Replaces flat or inconsistent buttons across Nexora with tactile, high-feedback interactive buttons meeting WCAG accessibility and modern aesthetic standards.

---

## 2. User Experience & Visual Design

- **Auto-Cut Creator Flow**:
  1. Open Media Creation Engine (`MediaCreationEngine.tsx`).
  2. Select "Auto-Cut Studio" mode.
  3. Choose template style (Beats, Cinematic, AI Highlight).
  4. Preview auto-generated cut timeline and export directly to feed.
- **Modern Button Styling**:
  - Consistent padding (`py-2.5 px-4`), smooth spring scale animations (`whileTap={{ scale: 0.96 }}`), and crisp iconography.

---

## 3. Technical Architecture & Component Updates

- **`MediaCreationEngine.tsx`**: Add dedicated Auto-Cut wizard modal with beat analysis simulation and preset template selection.
- **`ShareSheet.tsx` & Global Buttons**: Standardize button classes and interactive glow states across `ProfileView.tsx`, `FeedPostCard.tsx`, and navigation headers.
