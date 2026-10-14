import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI SDK if API key is present
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper: Generate high-definition SVG Data URL for backgrounds and avatars when offline or quota exceeded
function generateHighDefStreamerAsset(prompt: string, type: 'avatar' | 'background'): string {
  const isAvatar = type === 'avatar';
  const width = isAvatar ? 800 : 1280;
  const height = isAvatar ? 800 : 720;
  const seed = prompt.length;
  
  // Neon color palette
  const purple = '#9146FF';
  const neonGreen = '#53FC18';
  const darkBg = '#0B0E14';
  const slate = '#1E232F';

  if (isAvatar) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 800 800">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#2E1065"/>
          <stop offset="70%" stop-color="${darkBg}"/>
          <stop offset="100%" stop-color="#05070A"/>
        </radialGradient>
        <linearGradient id="neonRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${purple}"/>
          <stop offset="100%" stop-color="${neonGreen}"/>
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="800" height="800" fill="url(#bgGrad)"/>
      <circle cx="400" cy="400" r="360" fill="none" stroke="url(#neonRim)" stroke-width="8" opacity="0.8"/>
      
      <!-- Ambient Hex Grid -->
      <g stroke="#ffffff" stroke-width="1" opacity="0.05">
        <polygon points="400,100 480,150 480,250 400,300 320,250 320,150" fill="none"/>
        <polygon points="200,300 280,350 280,450 200,500 120,450 120,350" fill="none"/>
        <polygon points="600,300 680,350 680,450 600,500 520,450 520,350" fill="none"/>
      </g>

      <!-- Headset Arch -->
      <path d="M 230 400 A 170 170 0 0 1 570 400" fill="none" stroke="#334155" stroke-width="26" stroke-linecap="round"/>
      <path d="M 230 400 A 170 170 0 0 1 570 400" fill="none" stroke="url(#neonRim)" stroke-width="10" stroke-linecap="round" filter="url(#glow)"/>

      <!-- Streamer Silhouette & Hoodie -->
      <path d="M 260 760 C 260 620, 310 560, 400 560 C 490 560, 540 620, 540 760 Z" fill="#18181B" stroke="#27272A" stroke-width="4"/>
      <!-- Hoodie V-neck & zipper -->
      <path d="M 400 560 L 400 760" stroke="${neonGreen}" stroke-width="3" opacity="0.7"/>

      <!-- Head & Face -->
      <ellipse cx="400" cy="410" rx="115" ry="140" fill="#E2E8F0"/>
      <!-- Shading -->
      <path d="M 310 440 C 310 520, 360 550, 400 550 C 440 550, 490 520, 490 440 Z" fill="#CBD5E1"/>

      <!-- Hair -->
      <path d="M 270 370 C 280 260, 360 250, 400 250 C 470 250, 530 280, 530 380 C 490 320, 460 330, 420 320 C 370 310, 320 350, 270 370 Z" fill="#0F172A"/>
      <path d="M 330 280 Q 400 240 480 300" stroke="${purple}" stroke-width="8" fill="none" filter="url(#glow)"/>

      <!-- Headset Earcups -->
      <rect x="210" y="360" width="45" height="90" rx="20" fill="#09090B" stroke="${neonGreen}" stroke-width="4" filter="url(#glow)"/>
      <rect x="545" y="360" width="45" height="90" rx="20" fill="#09090B" stroke="${purple}" stroke-width="4" filter="url(#glow)"/>
      <!-- Microphone Boom -->
      <path d="M 235 440 Q 280 500 360 490" fill="none" stroke="#64748B" stroke-width="8" stroke-linecap="round"/>
      <circle cx="365" cy="490" r="14" fill="#09090B" stroke="${neonGreen}" stroke-width="4" filter="url(#glow)"/>

      <!-- Gamer Glasses / Eyes -->
      <rect x="315" y="380" width="70" height="40" rx="8" fill="#030712" stroke="${purple}" stroke-width="4"/>
      <rect x="415" y="380" width="70" height="40" rx="8" fill="#030712" stroke="${neonGreen}" stroke-width="4"/>
      <line x1="385" y1="398" x2="415" y2="398" stroke="#ffffff" stroke-width="4"/>
      
      <!-- Lens Reflections -->
      <line x1="325" y1="388" x2="350" y2="388" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <line x1="425" y1="388" x2="450" y2="388" stroke="${neonGreen}" stroke-width="3" stroke-linecap="round"/>

      <!-- Smile -->
      <path d="M 370 480 Q 400 505 430 480" fill="none" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>

      <!-- Badges -->
      <g transform="translate(400, 710)">
        <rect x="-110" y="-18" width="100" height="36" rx="8" fill="${purple}"/>
        <text x="-60" y="6" font-family="'Outfit', sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">TWITCH</text>
        <rect x="10" y="-18" width="100" height="36" rx="8" fill="${neonGreen}"/>
        <text x="60" y="6" font-family="'Outfit', sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle">KICK</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } else {
    // High production value 16:9 Esports arena backdrop
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="arenaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E0A3C"/>
          <stop offset="50%" stop-color="#0A0C16"/>
          <stop offset="100%" stop-color="#042014"/>
        </linearGradient>
        <radialGradient id="spotLight" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#9333EA" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <filter id="blurNeon" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="25" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <rect width="1280" height="720" fill="url(#arenaGrad)"/>
      <rect width="1280" height="720" fill="url(#spotLight)"/>

      <!-- Perspective Speedlines Floor -->
      <g stroke="${purple}" stroke-width="2" opacity="0.3">
        <line x1="640" y1="360" x2="0" y2="720" />
        <line x1="640" y1="360" x2="320" y2="720" />
        <line x1="640" y1="360" x2="640" y2="720" />
        <line x1="640" y1="360" x2="960" y2="720" />
        <line x1="640" y1="360" x2="1280" y2="720" />
      </g>

      <!-- Neon Green Accents -->
      <g stroke="${neonGreen}" stroke-width="3" opacity="0.6" filter="url(#blurNeon)">
        <polyline points="100,600 350,450 640,480 930,450 1180,600" fill="none"/>
      </g>

      <!-- Esports Arena Stage Lighting -->
      <polygon points="640,0 400,720 880,720" fill="none" stroke="${purple}" stroke-width="4" opacity="0.2"/>
      
      <!-- Top Cyber Grid Banner -->
      <rect x="340" y="40" width="600" height="120" rx="16" fill="#090D16" stroke="url(#neonRim)" stroke-width="2" opacity="0.8"/>
      <text x="640" y="115" font-family="'Outfit', sans-serif" font-weight="900" font-size="38" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
        ESPORTS BROADCAST ARENA
      </text>

      <!-- Geometric Sparks -->
      <circle cx="200" cy="220" r="4" fill="${neonGreen}" filter="url(#blurNeon)"/>
      <circle cx="1080" cy="200" r="4" fill="${purple}" filter="url(#blurNeon)"/>
      <circle cx="1150" cy="520" r="6" fill="${neonGreen}" filter="url(#blurNeon)"/>
      <circle cx="150" cy="480" r="6" fill="${purple}" filter="url(#blurNeon)"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

// 1. Endpoint: Stream Metadata Generator
app.post('/api/gemini/generate-metadata', async (req: Request, res: Response) => {
  const { category, topic, tone } = req.body;
  const safeCategory = category || 'Gaming';
  const safeTopic = topic || 'Transmisión Épica';

  const fallbackData = {
    titles: [
      `🔥 [DIRECTO] ${safeTopic} | ROAD TO TOP 1 EN VIVO`,
      `😱 ¡NO TIENE SENTIDO! ${safeCategory.toUpperCase()} TRYHARD CON DROPS`,
      `⚡ JUGANDO CON SUBS & SORTEO EXCLUSIVO | ${safeCategory}`,
      `💀 100% IMPOSIBLE? DESAFÍO EN ${safeTopic}`,
      `🎮 DOMINGO DE CHILL Y RISAS CON EL CHAT | KICK & TWITCH`
    ],
    description: `¡Bienvenidos a la transmisión unificada en Kick y Twitch! Hoy jugando ${safeCategory}: ${safeTopic}. ¡Sigue el canal y activa notificaciones para no perderte nada!`,
    tags: [safeCategory.toLowerCase().replace(/[^a-z0-9]/g, ''), 'espanol', 'drops', 'streamer', 'kick', 'twitch', 'tryhard']
  };

  if (!ai) {
    return res.json(fallbackData);
  }

  try {
    const prompt = `Actúa como estratega de streaming para Kick y Twitch.
Genera títulos virales con alto CTR (click-through rate), una descripción optimizada para el canal y etiquetas clave.
Categoría: ${safeCategory}
Tema: ${safeTopic}
Tono: ${tone || 'Hype, competitivo y amigable'}
Devuelve un JSON estructurado con: titles (array de 5 strings), description (string persuasivo), tags (array de 6-8 strings).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['titles', 'description', 'tags']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed.titles ? parsed : fallbackData);
  } catch (error) {
    console.warn('Gemini metadata fallback triggered:', error);
    return res.json(fallbackData);
  }
});

// 2. Endpoint: Thumbnail Concepts Generator
app.post('/api/gemini/thumbnail-concepts', async (req: Request, res: Response) => {
  const { topic, category, streamerStyle } = req.body;
  const safeTopic = topic || 'Clutch Épico';
  const safeCategory = category || 'Gaming';

  const fallbackConcepts = {
    concepts: [
      {
        titleText: "¡NO TIENE SENTIDO!",
        subText: `${safeTopic.toUpperCase()}`,
        badge: "RÉCORD MUNDIAL",
        palette: "Neon Purple & Kick Green",
        emotion: "Gritando / Cara de Shock",
        backgroundPrompt: "Escena de esports en alta tensión con explosión neón"
      },
      {
        titleText: "NUNCA HAGAS ESTO",
        subText: "NUEVA ACTUALIZACIÓN",
        badge: "DROPS ACTIVOS",
        palette: "Amarillo Fuego & Cyan",
        emotion: "Señalando con el dedo con intriga",
        backgroundPrompt: "Estudio streamer con luces hexagonales RGB"
      },
      {
        titleText: "¿EL MEJOR DE KICK?",
        subText: "FINAL DEL TORNEO",
        badge: "1v5 CLUTCH",
        palette: "Rojo Intenso & Blanco Puro",
        emotion: "Sonrisa confiada con auriculares pro",
        backgroundPrompt: "Estadio cyberpunk con focos láser"
      }
    ]
  };

  if (!ai) {
    return res.json(fallbackConcepts);
  }

  try {
    const prompt = `Crea 3 conceptos visuales potentes para miniaturas (thumbnails) de Kick y Twitch de alta conversión.
Juego: ${safeCategory}
Tema: ${safeTopic}
Estilo: ${streamerStyle || 'YouTuber / Streamer moderno'}
Devuelve un JSON con un array 'concepts', donde cada objeto contenga:
titleText (2 a 4 palabras mayúsculas), subText, badge, palette, emotion, backgroundPrompt.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  titleText: { type: Type.STRING },
                  subText: { type: Type.STRING },
                  badge: { type: Type.STRING },
                  palette: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                  backgroundPrompt: { type: Type.STRING }
                },
                required: ['titleText', 'subText', 'badge', 'palette', 'emotion', 'backgroundPrompt']
              }
            }
          },
          required: ['concepts']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed.concepts ? parsed : fallbackConcepts);
  } catch (error) {
    console.warn('Gemini thumbnail fallback triggered:', error);
    return res.json(fallbackConcepts);
  }
});

// 3. Endpoint: AI Image Generation (with resilient fallback so it NEVER fails)
app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
  const { prompt, aspectRatio = '16:9' } = req.body;
  const isSquare = aspectRatio === '1:1';

  // If AI is configured, attempt model generation
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: `High production value esports/gaming broadcast asset, ultra detailed, vibrant colors, cinematic lighting, 4k: ${prompt}`
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: isSquare ? '1:1' : '16:9'
          }
        }
      });

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            return res.json({ imageUrl, source: 'gemini-ai' });
          }
        }
      }
    } catch (err) {
      console.warn('Gemini image model unavailable or quota limited, switching to high-def procedural engine:', err);
    }
  }

  // Resilient High-Definition Streamer Graphic Fallback
  const fallbackUrl = generateHighDefStreamerAsset(prompt || 'streamer_studio', isSquare ? 'avatar' : 'background');
  return res.json({ imageUrl: fallbackUrl, source: 'streamhub-engine' });
});

// 4. Endpoint: AI Highlight Generator (Clips, Viral Titles, Social Tags & Description)
app.post('/api/gemini/generate-highlight-info', async (req: Request, res: Response) => {
  const { triggerType, gameCategory = 'Gaming', sceneName = 'Gameplay', intensity = 85, chatSnippet = [], notes = '' } = req.body;

  const isAudioSpike = triggerType === 'audio_spike';
  const isChatSpike = triggerType === 'chat_velocity';

  const defaultTitles = isAudioSpike
    ? [
        `😱 ¡GRITO HISTÓRICO! EL CLUTCH MÁS ÉPICO EN ${gameCategory.toUpperCase()}`,
        `🔥 ¡ROMPIÓ EL MICRÓFONO! REACCIÓN IMPOSIBLE EN VIVO`,
        `💀 NO TIENE SENTIDO: LA JUGADA QUE HIZO EXPLOTAR EL STREAM`
      ]
    : isChatSpike
    ? [
        `⚡ ¡EL CHAT SE VOLVIÓ COMPLETAMENTE LOCO! HYPE EN ${gameCategory.toUpperCase()}`,
        `💥 100+ MENSAJES POR SEGUNDO: ¡MOMENTO HISTÓRICO EN DIRECTO!`,
        `🤯 ¡CLIP THAT! CUANDO TODO EL STREAM SPAMMEA AL MISMO TIEMPO`
      ]
    : [
        `🎯 ¡MOMENTO DESTACADO! LA MEJOR JUGADA DE LA SESIÓN EN ${gameCategory.toUpperCase()}`,
        `🔥 TOP HIGHLIGHT: JUGADA MAESTRA EN KICK & TWITCH`,
        `⚡ ¡100% SKILL! ESTE CLIP TIENE QUE VERSE EN TIKTOK`
      ];

  const fallbackData = {
    titles: defaultTitles,
    summary: `Momento de máxima tensión e intensidad en directo jugando ${gameCategory}. Detección automática en escena "${sceneName}" con pico de actividad del ${intensity}%.`,
    tags: [gameCategory.toLowerCase().replace(/[^a-z0-9]/g, ''), 'highlight', 'clutch', 'streamer', 'kick', 'twitch', 'clipviral'],
    tiktokHashtags: [`#${gameCategory.toLowerCase()}`, '#gamingclips', '#twitchhighlights', '#kickstreamer', '#clutch', '#viralgaming'],
    thumbnailIdea: `Cara de asombro con ojos abiertos, fondo con explosión neón y texto grande: "${defaultTitles[0].split('!')[0]}!"`
  };

  if (!ai) {
    return res.json(fallbackData);
  }

  try {
    const prompt = `Actúa como editor profesional de clips virales para Twitch, Kick, TikTok Gaming y YouTube Shorts.
Se ha detectado automáticamente un momento de alta intensidad en una transmisión:
- Tipo de pico: ${triggerType} (${isAudioSpike ? 'Grito / Explosión de audio en micrófono' : isChatSpike ? 'Spam masivo de hype en el chat' : 'Marcador manual de jugada'})
- Juego / Categoría: ${gameCategory}
- Escena OBS: ${sceneName}
- Intensidad: ${intensity}%
- Mensajes recientes en chat: ${chatSnippet.slice(0, 5).join(' | ') || 'Pog, Clip that, GG, OMG'}
${notes ? `- Nota adicional: ${notes}` : ''}

Genera:
1. "titles": Array de 3 títulos altamente clickeables, virales y con mayúsculas y emojis para el clip (menos de 65 caracteres cada uno).
2. "summary": Una breve descripción llamativa para subir el video a redes (2-3 oraciones).
3. "tags": Array de 6-8 tags relevantes en minúsculas.
4. "tiktokHashtags": Array de 5-6 hashtags virales con "#" para TikTok y Shorts.
5. "thumbnailIdea": Una sugerencia visual para diseñar la miniatura del clip.

Devuelve un JSON estrictamente estructurado con estos campos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            tiktokHashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            thumbnailIdea: { type: Type.STRING }
          },
          required: ['titles', 'summary', 'tags', 'tiktokHashtags', 'thumbnailIdea']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed.titles ? parsed : fallbackData);
  } catch (error) {
    console.warn('Gemini highlight info fallback triggered:', error);
    return res.json(fallbackData);
  }
});

// 5. OBS WebSocket Backend Relay & Direct Device Probe (sin simulados: reporta real)
app.post('/api/obs/probe-connection', async (req: Request, res: Response) => {
  const { host = 'localhost', port = 4455 } = req.body;
  let settled = false;
  const done = (payload: object) => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      return res.json(payload);
    }
  };

  const ws = new WebSocket(`ws://${host}:${port}`, { handshakeTimeout: 2500 } as any);
  const timer = setTimeout(() => {
    done({
      connected: false,
      host,
      port,
      error: 'timeout: no hay respuesta en ws://' + host + ':' + port,
      tip: 'Verifica que OBS Studio esté abierto y que "Habilitar servidor WebSocket" esté activado en Herramientas > Configuración del servidor WebSocket. Si OBS está abierto pero el puerto está cerrado, el servidor WS está apagado.'
    });
  }, 3000);

  ws.on('open', () => {
    done({
      connected: true,
      host,
      port,
      message: 'OBS Studio WebSocket v5 detectado y enlazado correctamente.'
    });
  });

  ws.on('error', (err: Error) => {
    done({
      connected: false,
      host,
      port,
      error: err.message,
      tip: 'Verifica que OBS Studio esté abierto y que "Habilitar servidor WebSocket" esté activado en Herramientas > Configuración del servidor WebSocket.'
    });
  });
});

// 6. Real PC info (sin simulados): CPU, RAM, SO, red. La GPU/cámaras/mics se detectan en el frontend con WebGL + enumerateDevices.
app.get('/api/system/info', (_req: Request, res: Response) => {
  try {
    const cpus = os.cpus();
    const nets = os.networkInterfaces();
    const flatNets: Array<{ name: string; address: string; family: string }> = [];
    for (const [name, addrs] of Object.entries(nets)) {
      for (const a of addrs || []) {
        if (!a.internal && a.family === 'IPv4') flatNets.push({ name, address: a.address, family: a.family });
      }
    }
    return res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpuModel: cpus[0]?.model || 'desconocido',
      cpuCores: cpus.length,
      cpuSpeedMhz: cpus[0]?.speed || 0,
      totalMemBytes: os.totalmem(),
      freeMemBytes: os.freemem(),
      uptimeSeconds: Math.floor(os.uptime()),
      loadavg: os.loadavg(),
      network: flatNets,
      node: process.version,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'no se pudo leer el sistema' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    // SPA fallback: solo para no-API (Express 4 compatible)
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StreamHub Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
