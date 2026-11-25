# NEXORA native gallery

The Android Create experience uses the registered `NexoraMedia` Capacitor plugin to browse shared device media through MediaStore. The web and iOS experiences retain their existing privacy-preserving file-picker fallback.

## Access model

- NEXORA requests image access only when the Photos tab is opened and video access only when the Videos tab is opened.
- Android 13 (API 33) uses `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`.
- Android 14+ also supports `READ_MEDIA_VISUAL_USER_SELECTED`, so users can grant access to selected media rather than the entire library.
- Android 12 and earlier use `READ_EXTERNAL_STORAGE` (capped at API 32).
- The app does not request audio-library access.

## Browsing and import

- The native bridge returns metadata and 240px thumbnails for the first page of up to 120 items, ordered newest first.
- The UI groups media by date and exposes MediaStore album/folder names as filters.
- Additional pages are loaded only when requested.
- Full media bytes are copied to an app-private temporary cache only after the user selects an item. The web layer reads that temporary file through Capacitor's local-file bridge and asks the native plugin to delete it immediately afterwards.
- Import enforces the same 12 MB photo and 250 MB video limits as the existing composer, including a streaming size guard when MediaStore cannot report a file size.
- Existing validation, editor, video trimming, Studio handoff, and publishing remain the source of truth after import.

## Release verification

Before release, test on physical devices:

1. Android 12: grant and deny legacy storage access.
2. Android 13: grant images only, videos only, both, and deny.
3. Android 14/15: grant all media, grant selected media only, change the selected set in system settings, and deny.
4. Libraries with thousands of items; verify paging, date sections, and album filters.
5. Large photos, maximum-size videos, unsupported media, deleted items during browsing, and low-storage failures.
6. Verify temporary cache files are deleted after successful reads and failed imports.
7. Verify camera capture, editor preview, Studio handoff, and publishing after gallery import.

Broad media permissions and partial-access behavior must be reviewed against current Google Play policy before public distribution.
