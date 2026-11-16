# Historical Firebase named-database limitation

This note records a previous NEXORA architecture constraint. It is **not the current database configuration**.

The current checked-in Firebase configuration targets project `nexora-prod-voiceharrison`, Firestore database `default`, and Storage bucket `nexora-prod-voiceharrison.appspot.com`. The web client and `firebase.json` should be kept aligned with those reviewed values. A separate staging project must use its own isolated database and bucket.

Firebase Storage Rules cross-service Firestore lookups use the default Firestore database path. Consequently, Storage Rules cannot be assumed to authorize membership stored only in a separate named Firestore database. If NEXORA ever migrates chat metadata to a named database, do not move private-media authorization into Storage Rules without revalidating this platform limitation. The current private-chat-media design intentionally keeps authorization in the authenticated Express API: it verifies the Firebase ID token, reads membership from the configured Firestore database, verifies that a message references the requested object, and streams bounded private bytes with `Cache-Control: private, no-store`. Storage Rules continue to deny direct client access to private chat media.

References:

- [Cloud Firestore database management](https://firebase.google.com/docs/firestore/manage-databases)
- [Cloud Storage Security Rules conditions](https://firebase.google.com/docs/storage/security/rules-conditions)

Do not use the retired project `evident-server-bqmt3` or the historical named database ID from earlier versions of this note for deployment.
