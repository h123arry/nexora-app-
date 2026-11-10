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
};
