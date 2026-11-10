type TemplateField = { id: string; label: string; prompt: string; multiline?: boolean };
type CreatorTemplate = { id: string; title: string; category: string; description: string; outcome: string; fields: TemplateField[] };

export const CREATOR_ACADEMY_TOOLKITS: CreatorTemplate[] = [
  { id: 'content-brief', title: 'Content brief', category: 'Creation', description: 'Turn a loose idea into a clear piece of content with a defined audience outcome.', outcome: 'A focused production brief you can use before scripting or recording.', fields: [
    { id: 'audience', label: 'Who is this for?', prompt: 'Describe the people this piece should help.' },
    { id: 'goal', label: 'Audience outcome', prompt: 'What should someone understand, feel or be able to do afterwards?', multiline: true },
    { id: 'core-message', label: 'One central message', prompt: 'Write the single point this content must communicate.', multiline: true },
    { id: 'hook', label: 'Opening hook', prompt: 'Write a truthful opening that earns attention.', multiline: true },
    { id: 'proof', label: 'Examples or evidence', prompt: 'List examples, sources or demonstrations that support the message.', multiline: true },
    { id: 'call-to-action', label: 'Useful next step', prompt: 'What is the most relevant next action for the audience?' },
  ]},
  { id: 'publishing-plan', title: 'Two-week publishing plan', category: 'Planning', description: 'Build a manageable publishing rhythm around your real capacity.', outcome: 'A two-week plan with formats, production windows and recovery space.', fields: [
    { id: 'focus', label: 'Two-week focus', prompt: 'What theme or audience need will connect the work?' },
    { id: 'cadence', label: 'Realistic cadence', prompt: 'How many pieces can you publish without sacrificing quality?' },
    { id: 'formats', label: 'Repeatable formats', prompt: 'List the formats you can produce consistently.', multiline: true },
    { id: 'production', label: 'Production windows', prompt: 'When will you research, create, edit and publish?', multiline: true },
    { id: 'buffer', label: 'Buffer and rest', prompt: 'Where is your recovery time and contingency space?' },
    { id: 'review', label: 'Review date and signal', prompt: 'When will you review the plan, and what evidence will matter?' },
  ]},
  { id: 'audience-interview', title: 'Audience interview guide', category: 'Research', description: 'Learn from real audience needs instead of relying on assumptions.', outcome: 'A short interview plan and a structured record of what you learn.', fields: [
    { id: 'participant', label: 'Participant context', prompt: 'Describe the relevant audience context without recording unnecessary private data.' },
    { id: 'opening', label: 'Opening question', prompt: 'What open question will help the person describe their experience?', multiline: true },
    { id: 'challenge', label: 'Current challenge', prompt: 'What difficulty or unmet need did they describe?', multiline: true },
    { id: 'exact-words', label: 'Useful exact wording', prompt: 'Record a short quote only with permission. Otherwise paraphrase.' , multiline: true},
    { id: 'workaround', label: 'Current workaround', prompt: 'What do they do today, and what is frustrating about it?', multiline: true },
    { id: 'next-test', label: 'Follow-up hypothesis', prompt: 'What should you investigate next? Separate evidence from assumptions.' , multiline: true},
  ]},
  { id: 'partnership-proposal', title: 'Brand partnership proposal', category: 'Business', description: 'Prepare a transparent, professional partnership outline before negotiating.', outcome: 'A proposal brief that makes scope, value and obligations clear.', fields: [
    { id: 'brand-fit', label: 'Why this brand fits', prompt: 'Explain the genuine connection between the brand and your work.', multiline: true },
    { id: 'audience-fit', label: 'Audience relevance', prompt: 'What audience need does the partnership serve?' , multiline: true},
    { id: 'deliverables', label: 'Deliverables and dates', prompt: 'List the content, formats, deadlines and revision limits.', multiline: true },
    { id: 'usage-rights', label: 'Usage and licensing', prompt: 'Define where, how long and in what formats the brand may reuse the work.', multiline: true },
    { id: 'disclosure', label: 'Disclosure plan', prompt: 'How will the commercial relationship be clearly disclosed?' },
    { id: 'commercials', label: 'Commercial terms to agree', prompt: 'Record proposed fee, payment milestones, expenses and cancellation terms.', multiline: true },
  ]},
  { id: 'live-run-sheet', title: 'Live session run sheet', category: 'Live', description: 'Plan a structured live session with clear roles and contingency steps.', outcome: 'A timed show plan that helps hosts and moderators work together.', fields: [
    { id: 'purpose', label: 'Session purpose', prompt: 'What should viewers take away?' },
    { id: 'opening', label: 'Opening and context', prompt: 'How will you welcome viewers and explain the topic?', multiline: true },
    { id: 'segments', label: 'Timed segments', prompt: 'List segments, durations, hosts and transition cues.', multiline: true },
    { id: 'participation', label: 'Audience participation', prompt: 'How will questions or contributions be selected fairly?' , multiline: true},
    { id: 'moderation', label: 'Moderator responsibilities', prompt: 'Who handles reports, guest support and escalation?' },
    { id: 'contingency', label: 'Technical and safety fallback', prompt: 'What happens if a guest drops, harassment occurs or the stream fails?', multiline: true },
  ]},
  { id: 'community-charter', title: 'Community charter', category: 'Community', description: 'Set clear expectations for participation, moderation and member safety.', outcome: 'A concise charter that members can understand and moderators can apply.', fields: [
    { id: 'purpose', label: 'Community purpose', prompt: 'What brings members together?' , multiline: true},
    { id: 'welcome', label: 'Welcome promise', prompt: 'What should a new member expect?' , multiline: true},
    { id: 'positive-behaviour', label: 'What good participation looks like', prompt: 'List behaviours that make the space useful and welcoming.', multiline: true },
    { id: 'boundaries', label: 'Unacceptable behaviour', prompt: 'Describe harassment, privacy violations, spam and other prohibited conduct.', multiline: true },
    { id: 'moderation', label: 'Moderation and escalation', prompt: 'Describe warnings, content removal, restrictions and urgent escalation.', multiline: true },
    { id: 'reporting', label: 'How members can seek help', prompt: 'Explain the reporting route and what information to include.' },
  ]},
  { id: 'content-experiment', title: 'Content experiment tracker', category: 'Analytics', description: 'Test a specific creative hypothesis without overreacting to one result.', outcome: 'A fair experiment with a defined variable, measures and decision rule.', fields: [
    { id: 'question', label: 'Question to investigate', prompt: 'What do you want to understand?' },
    { id: 'hypothesis', label: 'Hypothesis', prompt: 'What do you expect to happen, and why?', multiline: true },
    { id: 'variable', label: 'One main variable', prompt: 'What will change while other factors remain as comparable as possible?' },
    { id: 'comparison', label: 'Comparable posts or baseline', prompt: 'Which examples will you compare?', multiline: true },
    { id: 'measure', label: 'Primary and guardrail measures', prompt: 'Which metric matters, and what quality or wellbeing signal must not worsen?' },
    { id: 'decision', label: 'Review window and decision rule', prompt: 'When will you review, and what result would support or weaken the hypothesis?', multiline: true },
  ]},
  { id: 'portfolio-case-study', title: 'Portfolio case study', category: 'Professional', description: 'Show your contribution and evidence without exaggerating outcomes.', outcome: 'A concise case study suitable for a portfolio or professional introduction.', fields: [
    { id: 'brief', label: 'Project brief', prompt: 'What was the objective and context?', multiline: true },
    { id: 'role', label: 'Your contribution', prompt: 'What did you personally own or deliver?' , multiline: true},
    { id: 'constraints', label: 'Constraints and decisions', prompt: 'What limits shaped your approach, and what choices did you make?', multiline: true },
    { id: 'process', label: 'Process', prompt: 'Describe the important steps and collaboration.', multiline: true },
    { id: 'result', label: 'Result and evidence', prompt: 'Use only outcomes you can substantiate. Include timeframe and source.', multiline: true },
    { id: 'permission', label: 'Permission and privacy check', prompt: 'Confirm what can be shared and remove confidential information.' },
  ]},
];

