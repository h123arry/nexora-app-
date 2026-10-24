# Firebase named-database implications for Nexora

Nexora's web client is configured to use the named Firestore database `ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8`, rather than `(default)`. Firebase documents that named databases must be targeted explicitly by clients and that rules must be deployed separately for each database. [1]

Firebase's Cloud Storage rules documentation shows cross-service Firestore lookups using `/databases/(default)/documents/...`. A Firebase feedback post quotes the Storage Rules documentation warning that, when multiple Firestore databases are active, Storage Rules can access documents only from the default database. This means a `firestore.get/exists` membership check against Nexora's named chat database cannot be assumed to protect chat-media objects. [2] [3]

The app must therefore avoid permanent public download tokens and direct Storage read authorization for private chat voice. The safe application boundary is a backend that verifies the Firebase ID token, reads membership from the actual named database, confirms the requested object is referenced by a message in that chat, and streams a bounded private object without caching it. Production validation must still verify the deployed Storage bucket, service-account permissions, named database ID, and legacy download-token revocation.

## References

[1]: https://firebase.google.com/docs/firestore/manage-databases "Manage Cloud Firestore databases"
[2]: https://firebase.google.com/docs/storage/security/rules-conditions "Cloud Storage Security Rules conditions"
[3]: https://firebase.uservoice.com/forums/948424-general/suggestions/49521512-firebase-storage-rules-support-for-multi-database "Firebase feedback on multi-database Storage lookups"
