# Phase 3: NEXORA Creator Academy institution expansion

## Delivery scope

Phase 3 extends the existing Creator Academy rather than introducing a parallel learning product.

### Curriculum
- 12 structured learning paths spanning creator foundations, storytelling, community, business, live production, analytics, brand, safety, video production, creator finance, creative rights and accessibility.
- 36 bundled lessons with authored lesson bodies, measurable objectives, practical assignments and reflection prompts.
- Existing published institutional courses remain available through the trusted course catalogue and versioned publishing workflow.

### Learner experience
- Account-scoped lesson completion and private study notes.
- Course-level progress and completion indicators.
- Server-graded assessments and certificate issuance remain restricted to published institutional courses; bundled introductory lessons do not award unassessed credentials.
- Mentorship discovery and transactional seat booking remain integrated.

### Creator workbench
- 12 reusable workbooks covering content briefs, publishing plans, audience interviews, partnership proposals, live run sheets, community charters, content experiments, portfolio case studies, production shot lists, creator budgets, rights registers and accessibility audits.
- Workbook drafts remain private to the signed-in account and are schema-limited by Firestore rules.

### Institution operations
- Instructor/editor role checks, course draft authoring, lesson authoring, editorial review, assessment publication, server-side grading, credential verification/revocation, tutor source grounding and mentorship management remain backed by trusted callables.
- Expanded bundled lesson allowlists are mirrored in backend progress validation and Firestore note authorization.

## Verification

Automated curriculum and toolkit tests assert unique IDs, lesson completeness, minimum content quality, structured exercises, reflection prompts and workbook schema quality. The existing institution emulator suite covers authoring, editorial approval, assessment answer-key protection, grading, idempotent certificate issuance, revocation, tutor source grounding, race-safe progress and mentorship capacity. The institution suite also verifies that a newly added bundled lesson can be recorded through the trusted progress service.

Run:
- `npm run test:unit`
- `npm run functions:build`
- `npm run lint`
- `npm run test:engagement` (includes Academy institution emulator coverage)

## Release boundary

This code does not create instructor accounts, seed published courses, configure external tutor model credentials, deploy functions, or publish production content. Institutional course publication still requires an authorised editor and staging acceptance. Certificates remain verifiable only when issued by the trusted service.
