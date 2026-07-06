# Security Specification for Nexora

## Data Invariants
1. A post cannot exist without a valid userId.
2. User profile updates can only be performed by the owner.

## The "Dirty Dozen" Payloads
1. Post with missing userId.
2. Post with invalid videoUrl format.
3. User profile update with spoofed username.
4. User profile update with invalid bio size.
5. Create post as another user.
6. Delete post owned by another user.
7. Post with empty caption (if caption is required).
8. User profile update with unauthorized field (e.g., isVerified: true).
9. Create post with future timestamp.
10. Update post with invalid views count.
11. User profile update with extreme string length for displayName.
12. Post creation with invalid userId format.

## The Test Runner
A `firestore.rules.test.ts` file should be created to test these payloads.
