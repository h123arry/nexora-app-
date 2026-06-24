import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Helper to initialize Gemini safely (lazy loading)
function getGeminiClient(): { ai: GoogleGenAI; model: string } | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return { ai, model: 'gemini-3.5-flash' };
}

// ----------------- VOH AI API ENDPOINTS -----------------

// 1. Interactive Chat Endpoint
app.post('/api/voh-ai/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const clientInfo = getGeminiClient();
    
    // Construct rich context string for the prompt
    const postsStr = context.posts && context.posts.length > 0
      ? context.posts.map((p: any) => `[Post by @${p.username} (${p.timestamp})]: "${p.content}" (Likes: ${p.likes}, Tags: ${p.tags?.join(', ') || 'none'})`).join('\n')
      : 'No posts in feed.';
      
    const userStr = context.currentUser 
      ? `User: ${context.currentUser.name} (@${context.currentUser.username}), Bio: "${context.currentUser.bio || ''}", Sparks: ${context.currentUser.sparks || 0}, Rep: ${context.currentUser.reputationPoints || 0}, Location: "${context.currentUser.location || ''}"`
      : 'Anonymous user';

    const circlesStr = context.circles && context.circles.length > 0
      ? context.circles.map((c: any) => `Circle: "${c.name}" - ${c.description} (Creator: @${c.creatorId}, Members: ${c.membersCount})`).join('\n')
      : 'No communities joined.';

    const notificationsStr = context.notifications && context.notifications.length > 0
      ? context.notifications.slice(0, 5).map((n: any) => `Notification: "${n.title}" (${n.timestamp})`).join('\n')
      : 'No recent notifications.';

    const contextPrompt = `
CURRENT NEXORA CONTEXT:
----------------------------------------
${userStr}

RECENT SOCIAL FEED (POSTS):
${postsStr}

JOINED COMMUNITIES (CIRCLES):
${circlesStr}

RECENT NOTIFICATIONS:
${notificationsStr}
----------------------------------------

USER MESSAGE:
"${message}"
`;

    if (!clientInfo) {
      // Graceful fallback response when API key is missing
      console.log('Gemini API Key is missing. Using premium mock response.');
      
      let replyText = '';
      const msgLower = message.toLowerCase();

      if (msgLower.includes('summarize') || msgLower.includes('feed')) {
        replyText = `### 📋 Nexora Feed Summary (Demo Mode)

Based on your active feed, here is the pulse:
- **Community Focus**: High interest in technology, responsive UI design, and creative coding.
- **Top Contributor**: **@voh** (Voice of Harrison) is discussing design rules and platform scaling.
- **Opportunities**: Collab requests for creative writers and frontend designers are trending in Port Harcourt.

*💡 Connect your real **Gemini API Key** in the **Settings > Secrets** panel to generate real-time AI summaries!*`;
      } else if (msgLower.includes('pulse') || msgLower.includes('trend')) {
        replyText = `### 🌌 World Pulse Matrix (Demo Mode)

The current Nexora Pulse Score is at **87/100**:
- **Trending Topics**: #SpaceGlass, #AIEngines, and #FootballNigeria.
- **Hub Activity**: High volume in Port Harcourt (soccer cup preparation) and Lagos (founder meetups).
- **AI Growth Forecast**: VOH AI predicts a **+14%** rise in UI/UX discussions tonight.

*💡 Connect your real **Gemini API Key** in the **Settings > Secrets** panel to generate real-time predictive indices!*`;
      } else if (msgLower.includes('opportunity') || msgLower.includes('opportunities') || msgLower.includes('job')) {
        replyText = `### 💼 Opportunity Match (Demo Mode)

I matched your profile with **1 active request**:
- **Role**: Creative UX Designer for Street Arts Merchandise.
- **Compensation**: Design royalty splits & project bonuses.
- **Skills Required**: Adobe Illustrator, Figma, Brand Design.

*💡 Connect your real **Gemini API Key** in the **Settings > Secrets** panel for deep semantic matching!*`;
      } else {
        replyText = `🤖 **VOH AI Status Indicator**:
I am currently operating in **Standby Demo Mode**.

**You asked**: "${message}"

To unlock my full cognitive intelligence, on-chain analytics, and real-time feed digestion, please configure your **GEMINI_API_KEY** in the **Settings > Secrets** panel of the AI Studio. 

In the meantime, you can ask me to:
- **Summarize my feed**
- **Show today's world pulse**
- **Find collaborative opportunities**`;
      }

      return res.json({ text: replyText, isDemo: true });
    }

    // AI is fully configured! Run the actual model call
    const { ai, model } = clientInfo;

    const systemInstruction = `You are VOH AI, an ultra-modern, intelligent, friendly, and helpful AI companion built by VOICE OF HARRISON (the founder and system architect of the Nexora platform).
Your tone is futuristic, polished, sleek, professional yet warm, aligning with Nexora's glassmorphic and elegant styling.
You are embedded directly inside Nexora Pulse and have real-time access to the user's local Nexora context, which includes the active feed, profile, joined communities, and notification list.

When answering:
1. Always maintain your identity as VOH AI. Do not pretend to be other bots or systems.
2. Use the provided Nexora context to answer questions accurately and contextually. If asked to "summarize my feed", parse the recent posts and summarize them.
3. If asked about sports, football, music (Wizkid vs Davido), local foods (Jollof, Catfish pepper soup), or startup opportunities in Nigeria (Lagos, Port Harcourt), synthesize from the actual items in the context or offer genuine real-world advice.
4. Format your responses with premium markdown typography: use clean headings, bullet points, bold key terms, and subtle emojis to emphasize key data.
5. If the user asks a general question, answer beautifully, clearly, and concisely. Keep responses engaging and directly scannable.`;

    const chatHistoryParts = history.map((h: any) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Generate response
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        ...chatHistoryParts,
        { role: 'user', parts: [{ text: contextPrompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || 'I analyzed the systems but couldn\'t form a response. Let\'s try again!', isDemo: false });

  } catch (error: any) {
    console.error('VOH AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to obtain AI response.', details: error.message });
  }
});

// 2. Improve/Polish Post Text Endpoint
app.post('/api/voh-ai/improve-post', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Post content is required.' });
    }

    const clientInfo = getGeminiClient();
    if (!clientInfo) {
      // Fallback
      return res.json({ 
        text: `${content} ✨ #ImprovedByVohAi (Connect Gemini API Key for smart enhancements!)`,
        isDemo: true 
      });
    }

    const { ai, model } = clientInfo;
    const response = await ai.models.generateContent({
      model: model,
      contents: `Improve and polish this social media post for Nexora, keeping its original core message but enhancing its flow, adding professional visual flair with clean linebreaks, a couple of elegant emojis, and highly relevant tags. Do not make it look like artificial marketing hype, keep it authentic and authentic to human creators:
      
      "${content}"`,
      config: {
        systemInstruction: "You are an expert social media copywriter who designs beautiful, authentic posts with balanced whitespace and tags.",
        temperature: 0.6,
      }
    });

    res.json({ text: response.text?.trim() || content, isDemo: false });

  } catch (error: any) {
    console.error('VOH AI Post Improvement Error:', error);
    res.status(500).json({ error: 'Failed to improve post.', details: error.message });
  }
});

// 3. Real-Time Audio Voice Transcription Endpoint
app.post('/api/voh-ai/voice-transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required.' });
    }

    const clientInfo = getGeminiClient();
    if (!clientInfo) {
      return res.json({
        transcription: "Beautiful sunny day in Nigeria, enjoying the vibes on Nexora!",
        replyText: "Voice post transcribed successfully! (Demo Mode - Connect your Gemini API Key in Settings > Secrets to enable real-time speech processing!)",
        isDemo: true
      });
    }

    const { ai, model } = clientInfo;

    // Send the voice message directly to Gemini to transcribe and comment on
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBase64
          }
        },
        {
          text: "Transcribe this audio precisely. Also provide a one-sentence friendly, encouraging comment on what is said."
        }
      ],
      config: {
        systemInstruction: "You are VOH AI. Transcribe the user's spoken words clearly, and add a brief encouraging note.",
        temperature: 0.4,
      }
    });

    const output = response.text || '';
    // Let's separate transcription and comment if possible, or just send the full text
    res.json({
      transcription: output,
      replyText: "Transcribed and parsed successfully!",
      isDemo: false
    });

  } catch (error: any) {
    console.error('VOH AI Voice Transcribe Error:', error);
    res.status(500).json({ error: 'Failed to process voice recording.', details: error.message });
  }
});


// ----------------- VITE DEVELOPMENT / PRODUCTION MIDDLEWARE -----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving static files in production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🌌 NEXORA PULSE CO-BUILDER RUNNING`);
    console.log(`🔗 Local Dev Server: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

startServer();
