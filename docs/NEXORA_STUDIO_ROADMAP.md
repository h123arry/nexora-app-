# NEXORA Studio · Engineering Roadmap

NEXORA Studio is an in-app editing workspace inside the existing Create experience. It must continue to use the existing NEXORA identity, authenticated Firebase media upload path, and post publishing path. It is not a separate app and must not become a mock editor with nonfunctional controls.

## Product principles

- Mobile-first editing that remains usable on mid-range Android devices.
- A real rendered output is required for every effect or edit described as applied.
- Keep source media intact until the creator confirms an export.
- Save drafts per signed-in account and never mix drafts between accounts on a shared device.
- Prefer progressive disclosure: a clear preview and timeline first, advanced controls when needed.
- Reuse the existing media lifecycle, creator templates, post model and publishing safeguards.
- Do not claim a feature is live until browser compatibility and export behavior have been verified.

## Current implementation

### Foundation (merged in PR #206)

- Studio entry from the Create menu.
- Multi-clip import, per-clip trim in/out, split at playhead, drag-to-reorder and remove.
- Bounded 40-step project-wide undo/redo history, including keyboard shortcuts and edit restoration across timeline, audio and title settings.
- Browser-side canvas + MediaRecorder WebM export.
- Source clip audio and optional soundtrack mixed through Web Audio when supported.
- Multiple independently timed text layers with separate colour, placement, font size, opacity, scale and rotation; edits are previewed and baked into export.
- Creator-imported PNG, JPEG and WebP image layers with independent timing, position, scale, rotation and opacity; layers are included in preview and export.
- Independently timed subtitle segments with a separate track from the post caption, live preview, local autosave, undo/redo and burned-in export.
- Shared global playhead with seek mapping across concatenated source clips, plus visual video, audio, image, text and subtitle lanes. Selecting a lane segment seeks the preview to its global timeline start.
- On-screen post caption.
- Per-account IndexedDB project autosave.
- Export upload through the authenticated Firebase media service and post creation through the existing NEXORA post path.
- Explicit capability errors when the browser cannot render the selected output.

### Editing controls (this tranche)

- Portrait 9:16, square 1:1 and landscape 16:9 output canvases.
- Preview aspect ratio follows the selected export format.
- Per-clip source audio volume and independent soundtrack volume.
- Microphone-recorded voiceover saved as a separate, timed audio track with independent volume and export mixing.
- Independent soundtrack and voiceover fade-in/fade-out envelopes, with optional automatic music ducking during narration.
- Pure audio-mix and waveform policies covered by focused unit tests.
- Decoded voiceover waveform preview and in-editor audio playback for supported recordings.
- Multi-layer title placement, timing, transforms and interpolated fade, zoom, slide-up and pop entrance/exit animation presets, with policy validation tests.
- Optional fade-through-black scene transitions between clips.

## Remaining delivery phases

### Phase 3 · Timeline and motion
- [x] Independent video, audio, image, text and subtitle lanes with a shared seekable playhead and clip-aware global seeking.
- Full continuous synchronized playback of all audio and visual lanes (still required).
- User-authored keyframes for independent animation of text, sticker and video layers.
- Cross-dissolve and selected transition presets beyond fade-through-black.

### Phase 4 · Audio and captions
- Clip-aligned waveform scrubbing and multi-region voiceover editing.
- Live mix preview with timeline-synchronized audio playback and audio/video sync validation.
- Rights-cleared NEXORA soundtrack library; no unlicensed commercial tracks.
- [x] Caption/subtitle tracks with timed segments, editable text and accessible defaults.
- Audio/video sync checks and export loudness safeguards.

### Phase 5 · Visual toolkit
- Text styles, title templates and reusable branded layouts.
- Stickers, shapes, overlays and creator-owned asset imports.
- Color controls and non-destructive filters.
- Cover-frame selection and custom thumbnails.
- NEXORA brand-safe templates that use the existing logo assets, never a replacement logo.

### Phase 6 · Export and publishing
- Device-aware resolution and bitrate presets.
- Robust MP4 output where a supported native/server renderer is available; WebM remains an explicitly labelled fallback.
- Background upload with resumable progress, retry and cancellation.
- Publish to posts and Reels through the existing publishing pipeline.
- Cloud draft sync and project recovery across signed-in devices.
- Export validation for duration, dimensions, codecs, audio tracks and playable output.

### Phase 7 · Quality and release
- Automated timeline policy tests and browser media integration tests.
- Mobile Android Chrome, iOS Safari and desktop browser acceptance.
- Large-file memory limits, low-storage behavior, offline recovery and thermal/performance checks.
- Accessibility review for keyboard, screen reader, contrast and touch targets.
- No rollout claims until staging uploads and two-account publishing checks pass.

## Known limitations

- Current export is WebM and depends on browser MediaRecorder, canvas capture and Web Audio support.
- Voiceover waveform decoding is capped at 30 MB per recording to avoid excessive memory use on mobile devices; larger recordings remain attachable and exportable but do not receive a generated waveform preview.
- Current project drafts are local to the same browser/device; cloud draft sync is not implemented.
- The shared timeline now seeks across video clips and shows independently timed visual/audio lanes. Continuous playback synchronization of soundtrack, voiceover, and every visual lane is still in progress.
- Fade-through-black is not a cross-dissolve.
- The editor supports multiple title layers and a dedicated timed subtitle track. Automatic speech-to-text transcription and continuous synchronized playback across all audio and visual lanes remain future work.
- Browser export has not been manually verified on every supported mobile browser; CI type-check/build and repository tests do not replace device acceptance testing.

## Release gates

1. CI, type-check, unit tests, security rules and production build pass.
2. At least one supported Android browser exports and plays a multi-clip video with original audio, soundtrack, title and transition.
3. The same account can close and restore a project; a different account cannot see it.
4. Exported media uploads through the existing Firebase lifecycle and is playable from a second signed-in account.
5. Failed export/upload preserves the source project and gives an actionable retry path.
6. The final PR is merged only after the required checks and the release gates that apply to the tranche are complete.
