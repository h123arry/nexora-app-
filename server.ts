import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { replaceTerminology } from './src/data/copyDictionary';

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
        'User-Agent': 'nexora-backend',
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
      // Fallback response when API key is missing
      console.warn('Gemini API Key is missing.');
      
      let replyText = '';
      const msgLower = message.toLowerCase();

      if (msgLower.includes('summarize') || msgLower.includes('feed')) {
        replyText = `### 📋 Nexora Feed Summary (Demo Mode)

Based on your active feed, here is the pulse:
- **Community Focus**: High interest in technology, responsive UI design, and creative coding.
- **Top Contributor**: **@voh** (Voice of Harrison) is discussing design rules and platform scaling.
- **Opportunities**: Collab requests for creative writers and frontend designers are trending in Port Harcourt.

*💡 Please ensure GEMINI_API_KEY is configured in your environment to generate real-time AI summaries!*`;
      } else if (msgLower.includes('pulse') || msgLower.includes('trend')) {
        replyText = `### 🌌 World Pulse Matrix (Demo Mode)

The current Nexora Pulse Score is at **87/100**:
- **Trending Topics**: #SpaceGlass, #AIEngines, and #FootballNigeria.
- **Hub Activity**: High volume in Port Harcourt (soccer cup preparation) and Lagos (founder meetups).
- **AI Growth Forecast**: VOH AI predicts a **+14%** rise in UI/UX discussions tonight.

*💡 Please ensure GEMINI_API_KEY is configured in your environment to generate real-time predictive indices!*`;
      } else if (msgLower.includes('opportunity') || msgLower.includes('opportunities') || msgLower.includes('job')) {
        replyText = `### 💼 Opportunity Match (Demo Mode)

I matched your profile with **1 active request**:
- **Role**: Creative UX Designer for Street Arts Merchandise.
- **Compensation**: Design royalty splits & project bonuses.
- **Skills Required**: Adobe Illustrator, Figma, Brand Design.

*💡 Please ensure GEMINI_API_KEY is configured in your environment for deep semantic matching!*`;
      } else {
        replyText = `🤖 **VOH AI Status Indicator**:
I am currently operating in **Standby Demo Mode**.

**You asked**: "${message}"

To unlock my full cognitive intelligence, on-chain analytics, and real-time feed digestion, please configure your **GEMINI_API_KEY** in your environment. 

In the meantime, you can ask me to:
- **Summarize my feed**
- **Show today's world pulse**
- **Find collaborative opportunities**`;
      }

      return res.json({ text: replaceTerminology(replyText), isDemo: true });
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
        systemInstruction: replaceTerminology(systemInstruction),
        temperature: 0.7,
      }
    });

    const rawText = response.text || 'I analyzed the systems but couldn\'t form a response. Let\'s try again!';
    res.json({ text: replaceTerminology(rawText), isDemo: false });

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
        replyText: "Voice post transcribed successfully!",
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

// 4. Summarize Post Endpoint
app.post('/api/voh-ai/summarize-post', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Post content is required.' });
    }

    const clientInfo = getGeminiClient();
    if (!clientInfo) {
      // Fallback
      return res.json({ 
        text: `TL;DR: ${content.substring(0, 50)}...`,
        isDemo: true 
      });
    }

    const { ai, model } = clientInfo;
    const response = await ai.models.generateContent({
      model: model,
      contents: `Provide a 1-sentence TL;DR summary of this post content:
      
      "${content}"`,
      config: {
        systemInstruction: "You are an intelligent summarizer. Provide concise, 1-sentence summaries.",
        temperature: 0.5,
      }
    });

    res.json({ text: response.text?.trim() || 'No summary generated.', isDemo: false });

  } catch (error: any) {
    console.error('VOH AI Summarize Error:', error);
    res.status(500).json({ error: 'Failed to summarize post.', details: error.message });
  }
});

// ----------------- SECURE PRODUCTION OTP VERIFICATION ENGINE -----------------

import crypto from 'crypto';
import { EmailService } from './src/services/firebase/emailService';

interface OtpRecord {
  email: string;
  hashedCode: string;
  expiresAt: number;
  attemptsLeft: number;
  purpose: string;
  createdAt: number;
  lastResendAt: number;
}

// In-memory cryptographically hashed OTP store
const otpStore = new Map<string, OtpRecord>();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper function to hash OTP securely
function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

// 1. Endpoint: Send Email OTP (for email verification, forgot password, identity confirmation)
app.post('/api/auth/send-email-otp', async (req, res) => {
  try {
    const { email, purpose = 'VERIFY_EMAIL', userName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const key = `${cleanEmail}:${purpose}`;
    const now = Date.now();

    // Check resend cooldown (60 seconds)
    const existing = otpStore.get(key);
    if (existing && now - existing.lastResendAt < 60000) {
      const waitSec = Math.ceil((60000 - (now - existing.lastResendAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSec} seconds before requesting a new verification code.`
      });
    }

    // Generate cryptographically secure 6-digit code
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = hashOtp(rawCode);

    // Expiration: 10 minutes (600,000 ms), Max 5 attempts
    const expiresAt = now + 10 * 60 * 1000;
    
    otpStore.set(key, {
      email: cleanEmail,
      hashedCode,
      expiresAt,
      attemptsLeft: 5,
      purpose,
      createdAt: now,
      lastResendAt: now
    });

    // Generate branded email HTML
    const resolvedName = userName || cleanEmail.split('@')[0];
    const templateType = purpose === 'PASSWORD_RESET' 
      ? 'PASSWORD_RESET' 
      : purpose === 'IDENTITY_CONFIRMATION' 
        ? 'IDENTITY_CONFIRMATION' 
        : 'VERIFY_EMAIL';

    const emailContent = EmailService.generateEmailHTML(templateType as any, {
      toEmail: cleanEmail,
      userName: resolvedName,
      verificationCode: rawCode
    });

    // Queue transactional email log to Firestore if available
    try {
      await EmailService.sendTransactionalEmail(templateType as any, {
        toEmail: cleanEmail,
        userName: resolvedName,
        verificationCode: rawCode
      });
    } catch (e) {
      console.warn('Firestore mail queue warning:', e);
    }

    console.log(`[OTP Engine] Secure ${purpose} OTP generated and dispatched to ${cleanEmail}. Expires in 10 mins.`);

    // Return success to client. CRITICAL: NEVER expose rawCode in response JSON!
    return res.json({
      success: true,
      message: `A secure 6-digit verification code has been dispatched to ${cleanEmail}.`,
      expiresInSeconds: 600
    });

  } catch (error: any) {
    console.error('Send Email OTP Error:', error);
    return res.status(500).json({ error: 'Failed to process verification request.', details: error.message });
  }
});

// 2. Endpoint: Verify Email OTP
app.post('/api/auth/verify-email-otp', async (req, res) => {
  try {
    const { email, code, purpose = 'VERIFY_EMAIL' } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const key = `${cleanEmail}:${purpose}`;
    const record = otpStore.get(key);

    if (!record) {
      return res.status(400).json({
        error: 'No active verification request found. Please request a new verification code.'
      });
    }

    const now = Date.now();

    // Check expiration (10 minutes)
    if (now > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.'
      });
    }

    // Check attempt limit (5 attempts max)
    if (record.attemptsLeft <= 0) {
      otpStore.delete(key);
      return res.status(400).json({
        error: 'Maximum verification attempts exceeded. Please request a new verification code.'
      });
    }

    // Hash submitted code and compare
    const submittedHash = hashOtp(code);
    if (submittedHash !== record.hashedCode) {
      record.attemptsLeft -= 1;
      if (record.attemptsLeft <= 0) {
        otpStore.delete(key);
        return res.status(400).json({
          error: 'Invalid verification code. Maximum attempts exceeded. Please request a new code.'
        });
      }
      return res.status(400).json({
        error: `Invalid verification code. ${record.attemptsLeft} attempts remaining.`
      });
    }

    // SUCCESS! Delete record to prevent OTP reuse!
    otpStore.delete(key);

    console.log(`[OTP Engine] Verification SUCCESS for ${cleanEmail} (${purpose}). OTP invalidated to prevent reuse.`);

    return res.json({
      success: true,
      message: 'Identity successfully verified.'
    });

  } catch (error: any) {
    console.error('Verify Email OTP Error:', error);
    return res.status(500).json({ error: 'Failed to verify code.', details: error.message });
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
    // Vite middleware mounted (logging removed)
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    // Serving static files in production mode (logging removed)
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
