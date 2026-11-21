import { normalizeStudioTextLayer, type StudioTextLayer } from './studioTextLayerPolicy';

export type StudioEditTemplateCategory =
  | 'Social' | 'Cinematic' | 'Vlog' | 'Travel' | 'Food' | 'Fashion'
  | 'Fitness' | 'Product' | 'Education' | 'Music' | 'Gaming' | 'Story';

export type StudioEditTemplateId =
  | 'violet-signal' | 'bold-hook' | 'creator-intro' | 'daily-recap'
  | 'cinema-chapter' | 'documentary' | 'film-memory' | 'dramatic-reveal'
  | 'day-in-life' | 'talking-head' | 'weekend-diary' | 'behind-scenes'
  | 'travel-diary' | 'destination-reveal' | 'food-story' | 'recipe-steps'
  | 'fashion-lookbook' | 'beauty-closeup' | 'product-showcase' | 'product-launch'
  | 'quick-tutorial' | 'study-notes' | 'workout-energy' | 'training-log'
  | 'music-performance' | 'beat-session' | 'gaming-highlight' | 'storytime';

export type StudioEditTemplate = {
  id: StudioEditTemplateId;
  name: string;
  category: StudioEditTemplateCategory;
  description: string;
  sample: string;
  tags: readonly string[];
  aspectRatio: 'portrait' | 'square' | 'landscape';
  transition: 'cut' | 'fade' | 'cross-dissolve';
  visualFilter: 'none' | 'cinematic' | 'warm' | 'monochrome' | 'vivid';
  soundtrackVolume: number;
  title: Omit<StudioTextLayer, 'id' | 'start' | 'end'>;
};

const title = (
  text: string,
  color: string,
  position: StudioTextLayer['position'],
  fontSize: number,
  animation: StudioTextLayer['animation'],
  animationDuration: number,
): StudioEditTemplate['title'] => ({
  text, color, position, fontSize, opacity: 1, scale: 1, rotation: 0,
  animation, animationDuration, keyframes: [],
});

export const STUDIO_EDIT_TEMPLATES: readonly StudioEditTemplate[] = [
  { id:'violet-signal', name:'Violet Signal', category:'Social', description:'A clean NEXORA-first opener for everyday vertical stories.', sample:'YOUR MOMENT', tags:['social','reels','creator'], aspectRatio:'portrait', transition:'cut', visualFilter:'vivid', soundtrackVolume:.8, title:title('YOUR MOMENT','#F5F7FF','center',58,'pop',.55) },
  { id:'bold-hook', name:'Bold Hook', category:'Social', description:'A fast, high-contrast opening for scroll-stopping clips.', sample:'WAIT FOR IT', tags:['hook','shorts','bold'], aspectRatio:'portrait', transition:'cut', visualFilter:'vivid', soundtrackVolume:.72, title:title('WAIT FOR IT','#FFFFFF','top',72,'zoom',.4) },
  { id:'creator-intro', name:'Creator Intro', category:'Social', description:'Introduce yourself or your channel with a confident title.', sample:'MEET THE CREATOR', tags:['intro','creator','profile'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'none', soundtrackVolume:.65, title:title('MEET THE CREATOR','#F6D98B','bottom',48,'slide-up',.7) },
  { id:'daily-recap', name:'Daily Recap', category:'Social', description:'A simple recap layout for multiple moments from your day.', sample:'TODAY IN 30 SECONDS', tags:['recap','daily','montage'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'warm', soundtrackVolume:.75, title:title('TODAY IN 30 SECONDS','#FFFFFF','top',44,'fade',.65) },
  { id:'cinema-chapter', name:'Cinema Chapter', category:'Cinematic', description:'Minimal chapter typography with a soft cinematic finish.', sample:'CHAPTER ONE', tags:['film','cinema','minimal'], aspectRatio:'landscape', transition:'fade', visualFilter:'cinematic', soundtrackVolume:.58, title:title('CHAPTER ONE','#FFFFFF','center',46,'fade',1.1) },
  { id:'documentary', name:'Documentary', category:'Cinematic', description:'Understated documentary title treatment for real stories.', sample:'A CLOSER LOOK', tags:['documentary','story','film'], aspectRatio:'landscape', transition:'cross-dissolve', visualFilter:'cinematic', soundtrackVolume:.48, title:title('A CLOSER LOOK','#F5F7FF','bottom',38,'fade',.9) },
  { id:'film-memory', name:'Film Memory', category:'Cinematic', description:'Warm, reflective treatment for memories and personal footage.', sample:'SOMEWHERE IN TIME', tags:['memory','nostalgia','film'], aspectRatio:'landscape', transition:'fade', visualFilter:'warm', soundtrackVolume:.55, title:title('SOMEWHERE IN TIME','#F3D9B2','center',42,'fade',1.2) },
  { id:'dramatic-reveal', name:'Dramatic Reveal', category:'Cinematic', description:'A bold reveal title with a deliberate fade transition.', sample:'THE REVEAL', tags:['reveal','dramatic','trailer'], aspectRatio:'landscape', transition:'fade', visualFilter:'monochrome', soundtrackVolume:.62, title:title('THE REVEAL','#FFFFFF','center',64,'zoom',.8) },
  { id:'day-in-life', name:'Day in My Life', category:'Vlog', description:'An easy-going vlog style for daily routines and moments.', sample:'A DAY WITH ME', tags:['vlog','routine','daily'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'warm', soundtrackVolume:.78, title:title('A DAY WITH ME','#FFFFFF','top',48,'slide-up',.6) },
  { id:'talking-head', name:'Talking Head', category:'Vlog', description:'Keep the frame clear and let your message lead.', sample:'LET’S TALK', tags:['talking','podcast','opinion'], aspectRatio:'portrait', transition:'cut', visualFilter:'none', soundtrackVolume:.25, title:title('LET’S TALK','#FFFFFF','bottom',44,'fade',.45) },
  { id:'weekend-diary', name:'Weekend Diary', category:'Vlog', description:'A relaxed montage for outings, friends and weekend clips.', sample:'WEEKEND DIARY', tags:['weekend','diary','montage'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'warm', soundtrackVolume:.82, title:title('WEEKEND DIARY','#F5F7FF','center',46,'pop',.6) },
  { id:'behind-scenes', name:'Behind the Scenes', category:'Vlog', description:'A casual behind-the-scenes look at your process.', sample:'BEHIND THE SCENES', tags:['bts','process','creator'], aspectRatio:'landscape', transition:'cut', visualFilter:'none', soundtrackVolume:.62, title:title('BEHIND THE SCENES','#FFFFFF','top',40,'slide-up',.55) },
  { id:'travel-diary', name:'Travel Diary', category:'Travel', description:'A polished travel montage with a warm, open feel.', sample:'POSTCARDS FROM…', tags:['travel','holiday','diary'], aspectRatio:'landscape', transition:'cross-dissolve', visualFilter:'warm', soundtrackVolume:.8, title:title('POSTCARDS FROM…','#FFFFFF','bottom',46,'fade',.8) },
  { id:'destination-reveal', name:'Destination Reveal', category:'Travel', description:'A dramatic destination opener for landscapes and city scenes.', sample:'NEXT STOP', tags:['destination','adventure','reveal'], aspectRatio:'portrait', transition:'fade', visualFilter:'vivid', soundtrackVolume:.82, title:title('NEXT STOP','#FFFFFF','center',60,'zoom',.65) },
  { id:'food-story', name:'Food Story', category:'Food', description:'A warm, appetising treatment for dishes and food reviews.', sample:'MADE WITH LOVE', tags:['food','restaurant','review'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'warm', soundtrackVolume:.72, title:title('MADE WITH LOVE','#FFF1D6','bottom',46,'pop',.55) },
  { id:'recipe-steps', name:'Recipe Steps', category:'Food', description:'A clear step-by-step recipe opener for cooking videos.', sample:'LET’S MAKE IT', tags:['recipe','cooking','tutorial'], aspectRatio:'portrait', transition:'cut', visualFilter:'warm', soundtrackVolume:.5, title:title('LET’S MAKE IT','#FFFFFF','top',48,'slide-up',.5) },
  { id:'fashion-lookbook', name:'Fashion Lookbook', category:'Fashion', description:'Editorial typography for outfit changes and style edits.', sample:'THE LOOKBOOK', tags:['fashion','outfit','style'], aspectRatio:'portrait', transition:'cut', visualFilter:'vivid', soundtrackVolume:.78, title:title('THE LOOKBOOK','#FFFFFF','center',56,'fade',.55) },
  { id:'beauty-closeup', name:'Beauty Close-up', category:'Fashion', description:'A softer, clean title treatment for beauty and detail shots.', sample:'THE DETAILS', tags:['beauty','makeup','skincare'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'warm', soundtrackVolume:.65, title:title('THE DETAILS','#F5E7FF','bottom',42,'fade',.75) },
  { id:'product-showcase', name:'Product Showcase', category:'Product', description:'Give a product its own clean, focused introduction.', sample:'MADE TO STAND OUT', tags:['product','brand','showcase'], aspectRatio:'square', transition:'fade', visualFilter:'vivid', soundtrackVolume:.7, title:title('MADE TO STAND OUT','#FFFFFF','bottom',42,'slide-up',.6) },
  { id:'product-launch', name:'Product Launch', category:'Product', description:'A confident launch opener for announcements and new drops.', sample:'INTRODUCING', tags:['launch','announcement','brand'], aspectRatio:'landscape', transition:'cut', visualFilter:'cinematic', soundtrackVolume:.75, title:title('INTRODUCING','#FFFFFF','center',62,'zoom',.5) },
  { id:'quick-tutorial', name:'Quick Tutorial', category:'Education', description:'A readable instructional opener that keeps footage in focus.', sample:'HOW TO…', tags:['howto','learning','guide'], aspectRatio:'portrait', transition:'cut', visualFilter:'none', soundtrackVolume:.35, title:title('HOW TO…','#FFFFFF','top',48,'slide-up',.5) },
  { id:'study-notes', name:'Study Notes', category:'Education', description:'A calm layout for explainers, notes and study summaries.', sample:'LET’S BREAK IT DOWN', tags:['study','explainer','education'], aspectRatio:'landscape', transition:'cross-dissolve', visualFilter:'none', soundtrackVolume:.3, title:title('LET’S BREAK IT DOWN','#D8C8FF','top',42,'fade',.7) },
  { id:'workout-energy', name:'Workout Energy', category:'Fitness', description:'A punchy vertical opener for workouts and fitness edits.', sample:'NO EXCUSES', tags:['fitness','gym','energy'], aspectRatio:'portrait', transition:'cut', visualFilter:'vivid', soundtrackVolume:.9, title:title('NO EXCUSES','#FFFFFF','center',64,'pop',.4) },
  { id:'training-log', name:'Training Log', category:'Fitness', description:'A measured training recap with a clean chapter heading.', sample:'WEEK 01 · PROGRESS', tags:['training','progress','log'], aspectRatio:'portrait', transition:'cross-dissolve', visualFilter:'cinematic', soundtrackVolume:.7, title:title('WEEK 01 · PROGRESS','#FFFFFF','bottom',40,'fade',.6) },
  { id:'music-performance', name:'Music Performance', category:'Music', description:'A performance-first layout with minimal on-screen text.', sample:'LIVE SESSION', tags:['music','performance','live'], aspectRatio:'landscape', transition:'cut', visualFilter:'cinematic', soundtrackVolume:.2, title:title('LIVE SESSION','#FFFFFF','bottom',40,'fade',.5) },
  { id:'beat-session', name:'Beat Session', category:'Music', description:'A vivid vertical treatment for music-led edits and dance clips.', sample:'FEEL THE BEAT', tags:['beat','dance','rhythm'], aspectRatio:'portrait', transition:'cut', visualFilter:'vivid', soundtrackVolume:.9, title:title('FEEL THE BEAT','#FFFFFF','center',58,'pop',.4) },
  { id:'gaming-highlight', name:'Gaming Highlight', category:'Gaming', description:'A bold landscape highlight opener for gameplay moments.', sample:'TOP PLAY', tags:['gaming','gameplay','highlight'], aspectRatio:'landscape', transition:'cut', visualFilter:'vivid', soundtrackVolume:.82, title:title('TOP PLAY','#FFFFFF','top',60,'zoom',.35) },
  { id:'storytime', name:'Storytime', category:'Story', description:'A personal-story opener with a softer, readable treatment.', sample:'LET ME TELL YOU', tags:['storytime','personal','voice'], aspectRatio:'portrait', transition:'fade', visualFilter:'warm', soundtrackVolume:.28, title:title('LET ME TELL YOU','#FFFFFF','bottom',44,'fade',.65) },
] as const;

export const STUDIO_EDIT_TEMPLATE_CATEGORIES = [
  'All', 'Social', 'Cinematic', 'Vlog', 'Travel', 'Food', 'Fashion',
  'Fitness', 'Product', 'Education', 'Music', 'Gaming', 'Story',
] as const;

export function searchStudioEditTemplates(query: string, category = 'All'): StudioEditTemplate[] {
  const normalized = query.trim().toLocaleLowerCase();
  return STUDIO_EDIT_TEMPLATES.filter(template => {
    const categoryMatches = category === 'All' || template.category === category;
    const haystack = [template.name, template.description, template.category, ...template.tags].join(' ').toLocaleLowerCase();
    return categoryMatches && (!normalized || haystack.includes(normalized));
  });
}

export function createStudioEditTemplate(templateId: StudioEditTemplateId, id: string, duration: number) {
  const template = STUDIO_EDIT_TEMPLATES.find(item => item.id === templateId);
  if (!template) throw new Error('Choose a valid Studio template.');
  return {
    aspectRatio: template.aspectRatio,
    transition: template.transition,
    visualFilter: template.visualFilter,
    soundtrackVolume: template.soundtrackVolume,
    textLayer: normalizeStudioTextLayer({
      ...template.title, id, start: 0, end: Math.min(Math.max(0, duration), 3.5),
    }, id),
  };
}
