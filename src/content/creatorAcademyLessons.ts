export type AcademyLessonEnrichment = {
  body: string;
  objectives: string[];
  exercise: string;
  reflection: string;
};

export const CREATOR_ACADEMY_LESSONS: Record<string, AcademyLessonEnrichment> = {
  identity: {
    body: "A durable creator identity sits at the intersection of what you know, what you care about, and what a specific audience needs. It is not a slogan or a visual aesthetic. It is the repeatable promise people experience when they spend time with your work. Start with your strongest subjects, the questions people already bring to you, and the perspective your lived experience or practice gives you. Then narrow the promise until a new visitor can understand it. A useful identity leaves room to evolve while remaining recognisable. Avoid copying another creator's voice: study their structure, then make the examples, judgement and point of view your own. Your profile, recurring formats and publishing choices should reinforce the same promise.",
    objectives: ["Describe the audience problem or interest your work serves.", "Write a clear one-sentence creator promise.", "Identify three recurring themes that support that promise."],
    exercise: "Write three versions of your creator promise using this structure: “I help [audience] understand or achieve [outcome] through [distinctive approach].” Ask two people in your intended audience which version is clearest, then revise it.",
    reflection: "Could a first-time visitor predict the kind of value they will receive from your next three posts?"
  },
  audience: {
    body: "An audience is not simply an age range or a follower count. It is a group of people connected by needs, interests, questions and context. Build an audience profile from observable signals: the questions people ask, the language they use, the obstacles they describe and the content they save or discuss. Separate what you know from what you are assuming. Do not treat one viral response as proof that everyone wants the same thing. Interview a small number of people, review thoughtful comments and look for repeated problems. The goal is not to please every person; it is to serve a clear group consistently while remaining open to new people who share the same interest.",
    objectives: ["Distinguish audience evidence from assumptions.", "Describe a primary audience through needs and behaviours.", "Choose a useful way to gather feedback."],
    exercise: "Create a one-page audience note with three recurring questions, three frustrations and three outcomes your audience wants. Label each item as observed, reported or still a hypothesis.",
    reflection: "What evidence would make you change your current picture of your audience?"
  },
  plan: {
    body: "A publishing plan is a production system, not a promise to post every day. Start with the time and tools you can reliably protect. Choose a small number of repeatable formats, define what “finished” means for each, and reserve time for research, creation, editing, publishing and community replies. A realistic cadence is more valuable than an ambitious schedule that repeatedly collapses. Build a buffer for illness, study, work and unexpected events. Review the plan after a few weeks using quality, consistency and your own energy as signals. Keep room for spontaneous work, but do not make every post an emergency.",
    objectives: ["Choose a cadence that fits real available time.", "Break a post into repeatable production stages.", "Create a simple review and recovery routine."],
    exercise: "Draft a two-week calendar with two core formats. For each item, estimate research, production and editing time, then add one buffer slot for delays.",
    reflection: "Which part of your schedule is most likely to fail, and what smaller fallback can protect consistency?"
  },
  hooks: {
    body: "The opening seconds should earn attention by accurately signalling why the content is worth a person's time. A strong hook can be a specific question, a surprising but supportable observation, a visible result or a moment of tension. It must connect to the payoff that follows. Avoid false urgency, exaggerated claims and bait that the rest of the post does not answer. Write the opening after you understand the central point, then remove setup that the audience does not need. Test clarity before cleverness: someone unfamiliar with the topic should understand the subject and reason to continue.",
    objectives: ["Identify the central promise of a piece of content.", "Write openings that are specific and truthful.", "Match the hook to the actual payoff."],
    exercise: "Take one idea and write five openings: a question, a result-first opening, a misconception, a short story moment and a direct promise. Reject any version the content cannot honestly fulfil.",
    reflection: "Does the opening make a promise that the rest of the post actually keeps?"
  },
  story: {
    body: "A memorable story gives information a shape. Even a short educational post can move through context, tension, discovery and payoff. Begin with the situation the audience recognises. Introduce the obstacle, question or decision that makes the subject matter. Show the steps that changed the situation, including useful details rather than skipping straight to the result. End with a conclusion that answers the opening question or gives the audience a next step. Remove scenes that do not advance understanding or emotion. A story can be personal, instructional, documentary or fictional, but make the format clear and respect the people represented.",
    objectives: ["Structure a piece with a clear beginning, progression and payoff.", "Use concrete details to make an idea understandable.", "Edit out sections that do not serve the story."],
    exercise: "Outline a 60-second story in five beats: context, problem, turning point, result and audience takeaway. Record a rough version and remove one sentence from every beat that feels unnecessary.",
    reflection: "What changes for the audience between the opening and the ending?"
  },
  quality: {
    body: "Quality improves through deliberate practice, not equipment alone. Decide what matters for the format: understandable audio, readable framing, accurate information, coherent pacing, accessible captions and a clear point. Fix the largest obstacle first. A better microphone will not repair an unclear argument; more effects will not rescue a confusing edit. Create a short pre-publish checklist and review one craft skill at a time. Keep original files where appropriate, check captions and names, and correct mistakes openly. Compare your work with your previous work rather than judging every post against a large creator's production budget.",
    objectives: ["Identify the highest-impact quality issue in a draft.", "Use a repeatable pre-publish checklist.", "Choose one craft skill for deliberate improvement."],
    exercise: "Review one recent post for sound, framing, pacing, factual accuracy, captions and clarity. Score each from 1–5, then improve the weakest item before publishing the next post.",
    reflection: "Which single improvement would make the next piece easier to understand or use?"
  },
  conversation: {
    body: "Community begins when people feel that their participation matters. Ask questions that invite useful experience rather than empty engagement. Respond with curiosity, acknowledge thoughtful disagreement and make it easy for newcomers to understand the discussion. Do not manufacture arguments or pressure people to disclose personal information. When a conversation grows, summarise useful points and connect related contributions. A creator does not need to reply to everything immediately; set a sustainable response window and communicate boundaries. The measure of a healthy conversation is not comment volume alone but whether people can contribute safely and leave with something valuable.",
    objectives: ["Write prompts that invite substantive responses.", "Model respectful and useful participation.", "Set boundaries for sustainable community interaction."],
    exercise: "Turn three generic prompts into specific questions that ask for examples, lessons or different approaches. Draft two response templates: one for constructive disagreement and one for a harmful comment that needs moderation.",
    reflection: "Would a thoughtful newcomer feel safe joining the conversation you have created?"
  },
  trust: {
    body: "Trust grows when expectations are clear and enforcement is consistent. Publish simple community standards covering harassment, threats, privacy, spam, misinformation and respectful disagreement. Explain how people can report concerns and what moderators may do. Apply rules to popular supporters and critics alike. Do not expose private reports or encourage followers to target someone. When you make a moderation mistake, correct it and explain the principle without revealing sensitive details. Trust also depends on accuracy: distinguish personal opinion, verified information and uncertainty. A healthy community is not one without disagreement; it is one where disagreement does not become abuse.",
    objectives: ["Define practical community rules.", "Choose proportionate moderation responses.", "Explain how transparency and consistency support trust."],
    exercise: "Write five community rules, each with one example of allowed behaviour and one example that crosses the line. Add a short reporting and escalation process.",
    reflection: "Would you apply each rule in the same way to your biggest supporter and your strongest critic?"
  },
  collab: {
    body: "Good collaboration creates value for both audiences and both collaborators. Start with a shared topic, complementary skills or a useful difference in perspective. Agree on the audience benefit, format, responsibilities, deadlines, ownership of files and how each person will be credited. Discuss boundaries before recording or publishing, including whether either party can request edits or withdraw sensitive material. Do not promise access to an audience or results you cannot guarantee. After release, review what worked for both sides and keep the relationship respectful even if the performance is modest.",
    objectives: ["Evaluate whether a collaboration has a shared purpose.", "Agree responsibilities and creative boundaries.", "Review outcomes without overclaiming impact."],
    exercise: "Draft a one-page collaboration brief: shared audience value, concept, deliverables, roles, timeline, credit, content approval and post-project review.",
    reflection: "Does the collaboration make something better than either creator could make alone?"
  },
  value: {
    body: "A sustainable creator business starts with value, not monetisation buttons. Identify the problem your work helps solve, the audience that experiences it and the outcome they can reasonably expect. Validate demand through conversations, repeat requests, small experiments and evidence of willingness to invest time or money. Be precise about what is included and what is not. Do not confuse attention with purchasing intent. A smaller group with a clear need may support a healthier business than a large but poorly matched audience. Protect trust by making claims you can deliver and by separating editorial judgement from paid promotion.",
    objectives: ["Describe a specific audience need.", "Connect an offer to a measurable, realistic outcome.", "Validate demand before investing heavily."],
    exercise: "Write a simple value proposition and interview three potential customers or supporters. Record their actual words, objections and current alternatives without trying to sell during the conversation.",
    reflection: "What evidence shows that people need this offer rather than merely saying it sounds interesting?"
  },
  revenue: {
    body: "Creator revenue can come from memberships, services, digital products, events, licensing, tips, subscriptions and brand partnerships. Each model has different costs, risks and obligations. Memberships require ongoing value and clear cancellation terms. Services require capacity planning. Products require support and delivery. Sponsorships require disclosure and brand fit. Tips should never be framed as a guaranteed investment or a way to buy influence. Estimate net income after platform fees, taxes, production costs, refunds and your time. Diversification can reduce dependence on one source, but launching too many offers at once can weaken quality.",
    objectives: ["Compare revenue models by effort, risk and audience fit.", "Estimate net rather than headline revenue.", "Choose one small experiment to validate."],
    exercise: "Compare three revenue models in a table: audience value, setup cost, ongoing workload, delivery obligations, platform fees and key risks. Select one low-risk pilot.",
    reflection: "Can you keep the promise of this revenue model without harming the quality of your core work?"
  },
  disclosure: {
    body: "A professional partnership is a business agreement, not just a product mention. Define deliverables, timelines, revision limits, usage rights, payment schedule, cancellation terms and the evidence required for completion. Confirm whether a brand can reuse the content and for how long. Disclose material relationships clearly where the audience can notice them; do not hide disclosures in vague language or distant hashtags. Keep your honest opinion and do not make unsupported product claims. If a partner asks you to mislead your audience, pause the work and reconsider the relationship. Retain written records of agreed terms.",
    objectives: ["Identify essential elements of a partnership brief.", "Explain why clear disclosure protects audience trust.", "Recognise requests that compromise editorial independence."],
    exercise: "Create a sample partnership checklist with scope, deadlines, compensation, usage rights, disclosure wording, revisions, cancellation and payment milestones.",
    reflection: "Would a viewer clearly understand that a commercial relationship exists?"
  },
  "run-of-show": {
    body: "A professional live session has a purpose and a sequence. Write a run of show with an opening, context, main segments, audience participation, transition points and a closing. Estimate time for each section and identify what can be shortened if the session runs late. Test audio, lighting, connection and moderator access before going live. Prepare a backup plan for technical interruptions. Tell guests how they will be introduced and how to signal if they need a break. A clear plan gives a broadcast structure without making it feel scripted or inflexible.",
    objectives: ["Define a clear outcome for a live session.", "Create a timed segment plan.", "Prepare technical and timing contingencies."],
    exercise: "Build a 30-minute run of show with five segments, named owners, transition cues and one backup plan for a guest or connection failure.",
    reflection: "If the broadcast lost ten minutes, which segment could be shortened without losing its purpose?"
  },
  hosting: {
    body: "Strong hosting makes participation feel easy while protecting the session's purpose. Introduce guests accurately, explain the topic and establish how questions will be handled. Ask open questions, listen to the answer and use follow-ups rather than rushing to the next prepared prompt. Make space for quieter participants and interrupt respectfully when someone dominates or moves off topic. Never pressure a guest to share private or distressing details. Close by summarising the useful points and naming any follow-up that has actually been agreed.",
    objectives: ["Use open questions and meaningful follow-ups.", "Balance participation across guests.", "Maintain consent and respectful boundaries."],
    exercise: "Prepare six open questions for a guest and two follow-ups for each. Practise a polite interruption that redirects a long answer without embarrassing the speaker.",
    reflection: "Did the host help the guest communicate, or did the host become the centre of attention?"
  },
  safety: {
    body: "Live safety requires preparation because moderation decisions happen quickly. Assign a moderator where possible, agree on escalation signals and define what should trigger a warning, removal or session end. Protect personal information and do not display private messages, addresses or account details. Explain how viewers can report harmful behaviour. Have a plan for harassment raids, threats, impersonation and a guest who becomes uncomfortable. Do not promise that every incident can be prevented. After a serious incident, document what happened through appropriate platform tools and review the process before the next session.",
    objectives: ["Prepare moderator roles and escalation signals.", "Protect guest and viewer privacy.", "Respond proportionately to harmful behaviour."],
    exercise: "Write a live safety checklist for before, during and after a broadcast. Include a named moderator role, escalation phrase, privacy check and stop-session condition.",
    reflection: "What would make you pause or end a session rather than trying to push through?"
  },
  metrics: {
    body: "Metrics answer different questions. Reach indicates distribution; impressions describe exposure; retention shows whether people stayed; meaningful replies and saves can indicate usefulness; follows and returning viewers can indicate ongoing interest. No single metric explains why a post performed as it did. Check definitions and time windows before comparing results. Avoid treating correlation as proof that one creative choice caused a change. Choose a small set of measures tied to your goal and pair them with qualitative feedback. A useful dashboard helps you make a decision, not simply watch numbers move.",
    objectives: ["Distinguish distribution, retention and relationship metrics.", "Select measures that match a content goal.", "Avoid conclusions unsupported by the data."],
    exercise: "Choose one recent post and write: its goal, two relevant metrics, one qualitative signal and one question the data cannot answer.",
    reflection: "What decision would you make differently because of this metric?"
  },
  retention: {
    body: "Retention is a pattern to investigate, not a score to worship. Look for where viewers leave, replay or continue, then compare those moments with the structure of the content. A drop may reflect a slow explanation, an unclear transition, a mismatch between the hook and the body or simply an audience that found the answer. Compare similar formats and account for length and distribution differences. Do not remove every pause or nuance in pursuit of watch time. The aim is to make valuable content easier to follow, not to manipulate people into staying.",
    objectives: ["Read retention patterns in context.", "Generate plausible explanations for audience drop-off.", "Improve clarity without sacrificing substance."],
    exercise: "Review a retention graph if available. Note two moments of change, propose at least two possible explanations for each and choose one edit to test next time.",
    reflection: "Does the proposed edit improve understanding, or only extend viewing time?"
  },
  experiments: {
    body: "A useful content experiment starts with a question and changes a limited number of variables. State the hypothesis, choose a comparable format and define what evidence would support or weaken the idea. Change one major element at a time where practical: opening, length, visual structure, topic framing or publishing window. Compare enough examples to avoid overreacting to one unusual result. Record context such as topic demand and distribution changes. Keep experiments ethical: do not mislead viewers, manufacture controversy or exploit sensitive events for reach.",
    objectives: ["Write a testable content hypothesis.", "Choose a fair comparison and success measure.", "Record results and limitations."],
    exercise: "Create a two-week experiment plan with a hypothesis, one variable, at least three comparable posts, a primary measure and a decision rule.",
    reflection: "What result would convince you that your original hypothesis was wrong?"
  },
  positioning: {
    body: "Positioning is the relationship between what you claim, what you publish and what people remember. Choose a clear area of contribution and explain your point of view in language your audience uses. Your profile should make it easy to understand who you serve, what you make and where to begin. Consistent positioning does not mean repeating the same post; it means making different work recognisably connected. Review the gap between your intended identity and the work people actually respond to. Adjust based on evidence while avoiding claims of expertise or outcomes you cannot support.",
    objectives: ["Define a distinctive and supportable area of contribution.", "Align profile language with published work.", "Review positioning using audience evidence."],
    exercise: "Audit your profile, three recent posts and pinned work. Highlight repeated themes, confusing signals and any claim that needs evidence or a narrower wording.",
    reflection: "What do you want people to remember after encountering three different pieces of your work?"
  },
  portfolio: {
    body: "A portfolio is a curated record of work and outcomes, not a collection of inflated claims. Select examples that demonstrate different relevant skills and explain your role in each. Include context: the brief, constraints, decisions and what you learned. Use measurable outcomes only when you can verify them and explain the time period. Obtain permission before sharing client or collaborator material. Keep the portfolio easy to scan and update it when your work changes. A small set of strong, well-explained examples is more persuasive than a large folder with no context.",
    objectives: ["Select work that demonstrates relevant skills.", "Explain your contribution and constraints honestly.", "Obtain permission for material that is not yours to share."],
    exercise: "Choose three projects and write a case note for each: objective, your role, process, result, evidence and lesson learned. Remove private information and confirm sharing permission.",
    reflection: "Could a potential collaborator understand exactly what you contributed?"
  },
  reputation: {
    body: "Reputation is built through repeated behaviour, especially when something goes wrong. Respond to criticism by separating a factual correction from a difference of opinion or an abusive attack. Ask for specifics when feedback is useful, acknowledge valid points and explain what you will change. Do not mobilise followers against critics or publish private correspondence to win an argument. Correct public errors in a visible way proportionate to the original claim. Keep boundaries: not every accusation deserves a response, and personal safety comes first. Consistency over time matters more than a perfect public image.",
    objectives: ["Classify feedback before responding.", "Correct mistakes without escalating conflict.", "Protect privacy and personal boundaries."],
    exercise: "Draft three response plans: a factual correction, a fair criticism and a targeted abusive comment. Include when to respond, when to moderate and when not to engage.",
    reflection: "Would your response reduce confusion and harm, or mainly defend your ego?"
  },
  security: {
    body: "Creator accounts are valuable assets and common targets for impersonation, phishing and account takeover. Use a unique password stored in a reputable password manager, enable available multi-factor authentication and secure the email account used for recovery. Never share one-time codes or approve an unexpected sign-in prompt. Check links and sender domains before entering credentials. Review connected apps and remove access you no longer need. Keep recovery information current and store backup codes securely. If you suspect compromise, use the platform's official recovery route, secure your email first and warn your audience through a trusted channel.",
    objectives: ["Identify common account takeover methods.", "Apply layered account security.", "Prepare a safe recovery plan."],
    exercise: "Complete a security review: password uniqueness, multi-factor authentication, recovery email, active sessions, connected apps and secure backup codes. Record any item you cannot verify.",
    reflection: "If you lost access today, which recovery step would be the weakest?"
  },
  rights: {
    body: "Creative rights involve more than giving credit. Music, images, footage, writing, performances and personal likeness may be protected by different rights or permissions. A public post is not automatically free to reuse. Check the licence and permitted uses, retain evidence of permission and follow attribution requirements. Obtain consent before publishing identifiable people in contexts where consent is expected, and take extra care with minors and private settings. If you receive a rights complaint, review the material and documentation rather than retaliating. When the rules are unclear, seek qualified advice before commercial use.",
    objectives: ["Identify common rights and permission questions.", "Distinguish attribution from a licence to use.", "Keep records of permissions and source material."],
    exercise: "Create a rights log for your next post listing every third-party asset, its source, licence or permission, required credit and any usage limits.",
    reflection: "Could you demonstrate that you have permission for every asset in this work?"
  },
  wellbeing: {
    body: "A sustainable creative practice protects the person doing the work. Set boundaries for notifications, comments, working hours and personal disclosure. Plan breaks and off-days rather than waiting until exhaustion forces them. Separate your worth from performance metrics and avoid checking analytics compulsively. Build a process that allows you to pause during difficult periods without feeling that your entire identity is at risk. Seek support from trusted people when online pressure affects your wellbeing. Sustainable ambition is not lower ambition; it is a system that can continue without consuming the creator.",
    objectives: ["Recognise personal warning signs of overload.", "Set boundaries around work and audience access.", "Build a realistic rest and recovery routine."],
    exercise: "Write a creator wellbeing agreement with working hours, notification windows, private topics, weekly rest time and one person you can contact when pressure becomes difficult.",
    reflection: "What boundary would make your creative work healthier immediately?"
  }
  'shot-planning': {
    body: "Video is easier to produce when the story is planned before the camera is opened. Start with the audience outcome and write the sequence of information or emotion the viewer needs. Convert each beat into a shot: a wide view for context, a medium view for action, a close view for detail, and supporting footage that proves or illustrates the point. Create a shot list with location, subject, framing, movement, audio and permissions. Check continuity and obtain consent before filming people or private spaces. A plan should remain flexible, but it prevents missing the detail that makes the story understandable.",
    objectives: ["Identify the audience outcome and story beats.", "Translate story beats into a practical shot list.", "Check consent, continuity and production constraints."],
    exercise: "Draft a 45-second sequence with an opening image, three supporting shots and a closing payoff. For every shot, write what information it adds and how you will capture it. Remove any shot that is decorative but does not help the story.",
    reflection: "Which image would make the story clearer if the viewer watched with the sound off?"
  },
  'sound-lighting': {
    body: "Clear sound is often more important to comprehension than expensive camera equipment. Record a short test in the actual environment and listen with headphones for echo, traffic, wind, clipping and background music. Move the microphone closer before increasing gain. Use available light deliberately: face a soft source where possible, avoid a bright window directly behind the subject, and check that important details remain visible. Lock exposure and focus when automatic changes would distract. Keep a backup recording when the interview or event cannot easily be repeated. Respect quiet spaces and never record private conversations without permission.",
    objectives: ["Recognise common recording problems before a shoot.", "Improve microphone placement and basic lighting.", "Create a repeatable sound and image check."],
    exercise: "Record a 20-second test in two locations. Compare echo, background noise, face visibility and exposure. Choose the better setup and write a five-point pre-recording checklist.",
    reflection: "Can every important sentence be understood on an ordinary phone speaker?"
  },
  'editing-workflow': {
    body: "Editing helps the audience follow the idea; it is not an invitation to add effects to every second. Build a rough cut around the central message, remove repeated explanations and keep transitions that show a meaningful change in time, place or perspective. Use music only when you have the rights and it supports rather than competes with speech. Check titles, names, facts and captions before export. Choose resolution and bitrate that fit the platform and source footage without needlessly enlarging files. Watch the final export from beginning to end, including opening, ending and audio levels, before publishing.",
    objectives: ["Build a rough cut around a clear message.", "Use pacing, transitions and sound intentionally.", "Review the exported file before publishing."],
    exercise: "Edit a one-minute sequence in three passes: story structure, pacing and accessibility. Record the changes made in each pass and export a review copy for a full watch-through.",
    reflection: "What can be removed without reducing the audience's understanding?"
  },
  'income-costs': {
    body: "Creator revenue is not the same as profit. Record each source separately, including platform payouts, memberships, gifts, sponsorships, services, product sales and licensing. Then record direct costs such as equipment, software, data, transport, production help, payment fees, refunds and promotion. Include irregular costs and the value of your own time when comparing offers. Do not treat pending balances as cash received, and do not assume a displayed gross figure is withdrawable. Keep personal and business spending distinguishable where practical. A simple, consistent record is more useful than an elaborate spreadsheet that is never updated.",
    objectives: ["Distinguish gross revenue, net income and cash received.", "Identify direct and recurring creator costs.", "Compare offers using realistic contribution margins."],
    exercise: "Create a monthly income-and-cost table with three revenue sources and five expense categories. Mark pending amounts separately from money actually received, then estimate the net contribution of each activity.",
    reflection: "Which revenue stream looks attractive before costs but less useful after fees and delivery time?"
  },
  'cash-flow': {
    body: "Cash flow describes when money enters and leaves, not just whether a business is profitable on paper. Creator income can be irregular, while subscriptions, production costs and contractor payments recur. Forecast expected receipts conservatively and separate confirmed funds from estimates. Build a reserve for essential costs and obligations before committing to upgrades or new projects. Set aside amounts for taxes and refunds according to local professional guidance. Review upcoming commitments weekly and avoid spending money that is still subject to platform review, chargebacks or settlement delays. A small, updated forecast can prevent a timing gap from becoming a crisis.",
    objectives: ["Explain the difference between profit and cash flow.", "Forecast near-term receipts and obligations conservatively.", "Plan reserves for refunds, taxes and essential costs."],
    exercise: "Prepare a 90-day cash-flow forecast with confirmed, probable and speculative income clearly separated. Add recurring costs, one-off commitments and a reserve target, then identify the month with the tightest balance.",
    reflection: "What would happen if your largest expected payment arrived thirty days late?"
  },
  'records-tax': {
    body: "Good records help creators understand their work and prepare accurate reports. Save invoices, receipts, platform statements, contracts, payment confirmations and evidence of refunds in a secure, organised system. Record date, counterparty, purpose, amount, currency and status for each transaction. Reconcile platform statements with actual bank receipts because fees, withholding and settlement timing may differ. Keep copies of important records and limit access to people who need them. Tax rules vary by country and business structure; use official local guidance or a qualified adviser for filing decisions rather than relying on generic social-media advice.",
    objectives: ["List the records needed to explain creator transactions.", "Reconcile platform statements with actual receipts.", "Recognise when local tax advice is required."],
    exercise: "Design a monthly close checklist covering income statements, receipts, fees, refunds, bank deposits and secure backups. Use sample figures only and note which tax questions require local advice.",
    reflection: "Could another authorised person understand how you arrived at the totals?"
  },
  'ownership-permissions': {
    body: "Original work can involve several rights at once: the recording, script, photograph, performance, logo, location and a person's likeness. Owning one element does not automatically give permission to reuse every other element. Agree who owns new material, what each collaborator may publish, how credits work and whether the work can be edited or licensed elsewhere. Obtain clear consent before using someone's image, voice or private story, especially in commercial content. Keep written permissions and respect limits on duration, territory, platforms and purpose. When the rights position is unclear, pause publication until it is resolved.",
    objectives: ["Identify the different rights that may exist in one post.", "Obtain informed permission for people and third-party material.", "Keep a usable record of licences and consent."],
    exercise: "Choose a recent piece of content and list every person, image, sound, location and brand appearing in it. For each, record the owner, permission source, permitted use and any expiry or restriction.",
    reflection: "What part of this work could you not ethically reuse if a collaborator withdrew permission?"
  },
  'music-image-licensing': {
    body: "A file being easy to download does not mean it is free to use. Music, photographs, illustrations, fonts and stock footage may have licences that limit commercial use, editing, redistribution, attribution or platform placement. Read the licence for the exact asset and save a copy or reference to its terms. Check whether a platform's built-in music permission applies only inside that platform. Do not remove watermarks or assume credit replaces permission. For user-submitted material, ask what rights the person actually controls. If a claim arrives, preserve the notice and respond through the proper rights process rather than re-uploading the same material repeatedly.",
    objectives: ["Read the scope and restrictions of a media licence.", "Distinguish attribution from permission.", "Keep evidence of rights for published assets."],
    exercise: "Create an asset register for five pieces of media. Record source, creator, licence, allowed platforms, commercial-use status, attribution and proof of permission. Flag any asset whose terms are unclear.",
    reflection: "Could you show the permission record for every third-party asset in your next campaign?"
  },
  'contracts-deliverables': {
    body: "A creator agreement should describe the work clearly enough that both sides can tell when it is complete. Define deliverables, formats, deadlines, revision limits, approval process, compensation, payment timing, expenses, cancellation, usage rights, exclusivity and disclosure obligations. Clarify whether a brand can edit or reuse content and whether paid advertising is included. Do not accept vague promises such as exposure in place of clear terms. Keep signed copies and written changes. Contract law differs across jurisdictions, so obtain local legal advice for high-value, exclusive or complex agreements.",
    objectives: ["Identify core clauses in a creator agreement.", "Define scope, payment and usage rights clearly.", "Recognise when specialist legal advice is appropriate."],
    exercise: "Review a sample campaign brief and write a list of missing terms. Draft a plain-language scope summary that includes deliverables, revisions, payment dates, usage, disclosure and cancellation.",
    reflection: "Which vague clause could create the biggest disagreement after delivery?"
  },
  'captions-transcripts': {
    body: "Captions make spoken content easier to follow for people who are deaf or hard of hearing, people watching without sound and viewers using a second language. Auto-generated captions are a starting point, not a final review. Correct names, numbers, technical terms, speaker changes and punctuation. Include meaningful non-speech audio when it changes meaning, such as [applause] or [alarm]. A transcript should preserve spoken information and identify speakers where useful. Keep captions synchronised, readable and positioned so they do not cover important visual information. Never invent words that were not spoken.",
    objectives: ["Explain the difference between captions and transcripts.", "Correct auto-caption errors and speaker labels.", "Check timing, readability and meaningful sound cues."],
    exercise: "Take a short recording and review every caption against the audio. Correct names and numbers, add meaningful sound cues, then test readability on a small phone screen.",
    reflection: "What information would be lost if someone relied only on your current captions?"
  },
  'visual-accessibility': {
    body: "Accessible visual design uses contrast, readable type, predictable structure and more than colour alone to communicate meaning. Avoid placing small text over busy footage and keep essential information on screen long enough to read. Describe important visual information in narration or a concise description when the audience would otherwise miss it. Avoid rapid flashing and unnecessary motion. Check that controls and text remain usable on a small screen and that the message still makes sense when sound is off. Accessibility improves clarity for everyone, including people with temporary constraints or low-quality connections.",
    objectives: ["Use contrast and readable type for mobile viewing.", "Describe important visual information when needed.", "Avoid motion and layout choices that block comprehension."],
    exercise: "Audit one post for text size, contrast, flashing, caption placement and information conveyed only through colour. Revise two issues and ask another person to review the result.",
    reflection: "Could someone understand the central point if they could not hear the audio or distinguish the colours?"
  },
  'inclusive-community': {
    body: "Inclusive participation is designed into the way a creator invites, moderates and responds to people. Use language that does not assume every viewer shares the same background, ability, resources or experience. Offer more than one way to participate and avoid making public disclosure a condition of belonging. Explain community rules in plain language and apply them consistently. When a person points out a barrier, listen before defending the design. Do not promise that a space is safe for everyone; explain safeguards, limits and reporting options honestly. Inclusion is an ongoing practice of noticing who is missing and reducing avoidable barriers.",
    objectives: ["Recognise assumptions that can exclude audience members.", "Offer multiple, low-pressure ways to participate.", "Respond constructively to accessibility and inclusion feedback."],
    exercise: "Review a community prompt, event invitation and moderation rule. Rewrite each to remove unnecessary barriers and add a private route for people who cannot participate publicly.",
    reflection: "Who might find your current format difficult to access, and what practical alternative can you provide?"
  },
};