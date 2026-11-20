# NEXORA

## The World's Living Social Network

**One network. Real connections. Endless possibilities.**

NEXORA is a social platform built to bring people, creators, conversations, communities, and digital experiences together in one connected place. It combines a personalized social feed, photo and video sharing, profiles, messaging, communities, creator tools, discovery, and a growing digital gift economy.

NEXORA is designed around a simple idea: social media should feel like a place people belong, not just a place they scroll.

**Brand identity:** Nexora Violet — a premium violet signal on a private midnight canvas.

---

## Project status

**NEXORA is deployed and in production use.** The platform has moved beyond a development-only project: real early users are registering and sharing photos, videos, written posts, and other content.

The product is now in its real-world refinement and growth stage. Development priorities include performance, reliability, usability, privacy, safety, and the quality of the everyday user experience as the community grows.

Production status describes the deployed platform. Individual integrations and capabilities can still depend on their required provider configuration, operational safeguards, and release settings. We distinguish implemented application functionality from optional services or financial operations that have not been cleared for live use.

## What NEXORA brings together

### Social feed and discovery
- A social home for discovering and keeping up with people, creators, and posts.
- Personalized feed experiences and content discovery.
- Post interactions including comments, replies, reactions/Sparks, sharing, and saved content.
- Search and discovery experiences for people and content.
- Feed preferences and controls designed to help people shape what they see.

### Photos, videos, and creation
- Photo and multi-photo publishing for visual storytelling.
- Vertical, full-screen video experiences for immersive viewing.
- A unified creation flow for composing and sharing content.
- Media preparation and upload flows designed for real user-generated content.
- Creator-facing content and publishing experiences.

### Profiles and identity
- Personal profiles and public identity.
- Profile photos, cover images, profile details, and account settings.
- Follow relationships and creator identity.
- Account-aware profile and social activity experiences.

### Messaging and communication
- Direct conversations with real-time message updates.
- Conversation activity, read states, and communication preferences.
- Voice-note and media-sharing capabilities, subject to the enabled media routes and permissions.
- Private media access is designed around authenticated conversation participants.

### Communities and Circles
- Community discovery, membership, and group participation.
- Circle discussions, group messages, polls, events, and announcements.
- Member roles and moderation workflows.
- Access controls for community and member-scoped content.

### Creators and Creator Academy
- Creator-facing tools and dashboard experiences.
- Creator education through the NEXORA Creator Academy.
- Learning progress and institutional course capabilities.
- Creator growth and achievement experiences.

### GiftVerse and the NEX economy
- GiftVerse is NEXORA's digital gifting universe, with a catalogue of more than 1,100 gifts represented in the project.
- Gifts have their own identities, artwork, categories, and catalogue information.
- Gift delivery, collection, and creator-economy workflows are built around server-authoritative transaction handling.
- NEX uses a ledger-based wallet model for supported in-platform transactions.

NEX is an internal platform unit. It should not be described as a bank deposit, guaranteed cash equivalent, or freely withdrawable currency. Creator withdrawals and cash settlement remain subject to the required provider, compliance, funding, and operational approvals. The presence of payout code does not by itself mean live withdrawals are enabled.

### Notifications and activity
- An Activity experience for social and account-related updates.
- Notification identity and navigation designed to take users to the relevant person or activity.
- Push-notification support where the relevant device, browser, and server configuration is enabled.

### VOH AI
- VOH AI capabilities are integrated into the wider NEXORA experience.
- Server-side AI features depend on a valid provider configuration and available service access.
- Private provider credentials must remain on the server and must never be committed to the repository or exposed in browser code.

---

## Platform architecture

NEXORA is developed in its existing application architecture. The project is not a replacement or rewrite of the original platform.

| Technology | Role |
| --- | --- |
| React 19 | Application interface |
| TypeScript | Application and server-side type safety |
| Vite | Frontend development and build tooling |
| Tailwind CSS 4 | Styling and responsive UI |
| Motion | Interface and interaction animation |
| Express 4 | Node.js server and API routes |
| Firebase Authentication | Account identity and authentication |
| Cloud Firestore | Application data, profiles, posts, conversations, communities, and other persisted records |
| Firebase Functions | Trusted server-side operations and event-driven workflows |
| Cloudflare R2 | Media object storage and authenticated media workflows |
| Google Gemini | Optional server-side AI provider for VOH AI |
| Capacitor | Android and iOS application packaging and native integration |

The root application targets **Node.js 22**. Refer to the lockfiles and package manifests for the exact dependency versions.

## Security and responsible operation

Security and data integrity are core engineering requirements, not optional polish. The existing codebase includes security-oriented controls such as:

- Authenticated account and API flows.
- Server-side authorization for protected operations.
- Firestore security rules and emulator-based rules tests.
- Authenticated media upload and playback routes.
- Media validation and upload lifecycle safeguards.
- Rate limiting and bounded request handling on protected server routes.
- Transactional handling for supported wallet, gift, and other sensitive operations.
- Secret scanning and environment separation practices.

The presence of a control in source code or a passing emulator test is not, by itself, proof that every production resource is correctly configured. Production security also depends on deployed rules, IAM, secrets, provider settings, backups, monitoring, and ongoing operational review. Never commit service-account credentials, API secrets, signing keys, or private environment files.

## Production and real-world refinement

NEXORA is now being shaped by real usage, not only by development assumptions. The next stage focuses on:

1. **Performance:** fast loading, responsive interactions, efficient media delivery, and smooth scrolling.
2. **Reliability:** consistent publishing, messaging, notifications, and account experiences.
3. **User experience:** clear language, intuitive navigation, accessible interactions, and thoughtful details.
4. **Privacy and safety:** protecting accounts, conversations, user content, and community spaces.
5. **Retention and community:** understanding what brings people back and what helps meaningful connections grow.
6. **Scalability:** maintaining quality as registrations, content, and activity increase.

The goal is not to add features simply to match a competitor's checklist. The goal is to make the features NEXORA offers genuinely useful, dependable, and enjoyable.

## Getting started

### Requirements
- Node.js 22
- npm
- Java 21 when running Firebase Emulator Suite tests
- Access to an approved Firebase emulator or non-production environment for backend-dependent development

### Install

```sh
git clone https://github.com/h123arry/nexora-app-.git
cd nexora-app-
npm ci
npm ci --prefix functions
```

### Configure the environment

Review `.env.example` and the deployment documentation before creating a local `.env` file.

Use emulator or owner-approved staging resources for local development. Do not point local experiments at production data. Browser-visible `VITE_*` values are configuration, not secrets. Private credentials such as `GEMINI_API_KEY`, Firebase service-account credentials, and storage signing secrets must remain server-side and must never be committed.

### Run locally

```sh
npm run dev
```

The development server uses the configured `PORT` (default `3000`).

### Build

```sh
npm run build
npm start
```

For deployment and environment setup, consult the runbooks in the `docs/` directory, including:

- [Deployment runbook](docs/deployment-runbook.md)
- [Firebase deployment runbook](docs/FIREBASE_DEPLOYMENT_RUNBOOK.md)
- [Staging setup and verification](docs/staging-setup-and-verification.md)
- [Phase 6 integration and launch-readiness matrix](docs/phase-6-integration-and-launch-readiness.md)

## Checks and tests

The repository provides focused checks for application code, server functions, security policies, and Firebase emulator behavior. Common commands include:

| Command | Purpose |
| --- | --- |
| `npm run lint` | TypeScript validation |
| `npm run build` | Build the frontend and bundled server |
| `npm run functions:build` | Build Firebase Functions |
| `npm run test:unit` | Unit and policy tests |
| `npm run test:auth` | Authentication tests using emulators |
| `npm run test:rules` | Firestore rules tests |
| `npm run test:storage` | Storage rules tests |
| `npm run test:engagement` | Engagement and related server workflow tests |
| `npm run test:voh-security` | VOH API security tests |
| `npm run security:scan` | Scan tracked files for secret patterns |
| `npm run validate:deployment` | Validate deployment metadata; does not deploy |

Run the relevant checks for the area you change. Emulator tests use isolated demo projects and do not test production user data. A passing CI workflow is valuable evidence about the commit, but it is not a substitute for production monitoring or real-device acceptance testing.

## Project principles

- Improve the existing NEXORA architecture; do not replace working systems without a clear reason.
- Build real, persistent experiences rather than presenting mock interactions as completed functionality.
- Preserve user data and enforce authentication, authorization, and privacy boundaries.
- Keep integrations fail-closed when required credentials or provider configuration are missing.
- Test changes and review deployment targets before release.
- Keep the Nexora Violet identity consistent and reuse the established NEXORA brand assets.
- Be transparent about optional integrations and financial operations that are not enabled.
- Let real user needs and observed product quality guide the roadmap.

## Contributing

Work in the existing repository and follow its current architecture and conventions. Before changing a feature, inspect its existing UI, services, persistence model, security rules, and tests. Keep changes focused, validate the affected workflows, and document any required environment or deployment changes.

## License

No root `LICENSE` file is currently declared. All rights and permissions should be treated as reserved unless a license is added by the project owner.

---

**NEXORA — The World's Living Social Network**

*Connection. Creativity. Community. A world that moves with its people.*
