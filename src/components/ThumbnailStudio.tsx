import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Download, Check, Image as ImageIcon, Type,
  Sliders, Wand2, Upload, RefreshCw, Eye, ArrowRight, Flame
} from 'lucide-react';
import { ThumbnailProject } from '../types/stream';

interface ThumbnailStudioProps {
  onApplyThumbnailToStream: (thumbnailDataUrl: string) => void;
  initialHeadlineText?: string;
  initialBackgroundUrl?: string;
}

const PRESET_BACKGROUNDS = [
  { id: 'bg_gaming', name: 'Esports Arena Neon', url: '/src/assets/images/thumbnail_gaming_action_1791998919003.jpg' },
  { id: 'bg_studio', name: 'Estudio RGB Streamer', url: '/src/assets/images/thumbnail_irl_reaction_1791998919984.jpg' },
  { id: 'bg_banner', name: 'Dark Speedlines', url: '/src/assets/images/channel_stream_banner_1791998919824.jpg' }
];

const PRESET_STREAMERS = [
  { id: 'streamer_headset', name: 'Streamer con Auriculares Pro', url: '/src/assets/images/streamer_avatar_creator_1791998920448.jpg' },
];

export const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({
  onApplyThumbnailToStream,
  initialHeadlineText,
  initialBackgroundUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // AI Prompt & Generator state
  const [topicKeywords, setTopicKeywords] = useState(initialHeadlineText || 'VALORANT 1v4 CLUTCH ÉPICO');
  const [streamerStyle, setStreamerStyle] = useState('Viral High-CTR Esports');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiConcepts, setAiConcepts] = useState<any[]>([]);

  // Project Editor State
  const [project, setProject] = useState<ThumbnailProject>({
    id: 'proj_default',
    title: 'Miniatura Principal',
    backgroundType: 'image',
    backgroundImageUrl: '/src/assets/images/thumbnail_gaming_action_1791998919003.jpg',
    backgroundColor: '#0a0a0f',
    gradientFrom: '#581c87',
    gradientTo: '#064e3b',
    streamerImage: '/src/assets/images/streamer_avatar_creator_1791998920448.jpg',
    showStreamerCutout: true,
    streamerPosition: 'right',
    streamerGlow: true,
    headlineText: '¡NO TIENE SENTIDO!',
    headlineColor: '#ffffff',
    headlineStroke: '#000000',
    sublineText: '1v4 CLUTCH EN VIVO',
    badgeText: 'TOP 1 GLOBAL',
    brightness: 5,
    contrast: 15,
    saturation: 20,
    vignette: true,
    borderGlowColor: '#53fc18',
    showBorders: true,
    layers: []
  });

  const [activeTab, setActiveTab] = useState<'ai' | 'text' | 'streamer' | 'adjust' | 'presets'>('ai');
  const [stickerKick, setStickerKick] = useState(true);
  const [stickerTwitch, setStickerTwitch] = useState(true);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Apply incoming headline or background if opened from Highlights
  useEffect(() => {
    if (initialHeadlineText) {
      setTopicKeywords(initialHeadlineText);
      setProject(prev => ({
        ...prev,
        headlineText: initialHeadlineText.toUpperCase(),
        title: initialHeadlineText,
      }));
    }
    if (initialBackgroundUrl) {
      setProject(prev => ({
        ...prev,
        backgroundImageUrl: initialBackgroundUrl,
      }));
    }
  }, [initialHeadlineText, initialBackgroundUrl]);

  // Re-render HTML5 Canvas whenever project properties change
  useEffect(() => {
    renderCanvas();
  }, [project, stickerKick, stickerTwitch]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background
    if (project.backgroundType === 'image' && project.backgroundImageUrl) {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        // Draw background with filters applied
        ctx.save();
        ctx.filter = `brightness(${100 + project.brightness}%) contrast(${100 + project.contrast}%) saturate(${100 + project.saturation}%)`;
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.restore();

        drawRemainingLayers(ctx, width, height);
      };
      bgImg.onerror = () => {
        // Fallback gradient if image fails
        drawFallbackGradient(ctx, width, height);
        drawRemainingLayers(ctx, width, height);
      };
      bgImg.src = project.backgroundImageUrl;
    } else {
      drawFallbackGradient(ctx, width, height);
      drawRemainingLayers(ctx, width, height);
    }
  };

  const drawFallbackGradient = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#3b0764');
    grad.addColorStop(0.5, '#09090b');
    grad.addColorStop(1, '#064e3b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  };

  const drawRemainingLayers = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 2. Vignette Darkening (makes thumbnail pop)
    if (project.vignette) {
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.3,
        width / 2, height / 2, width * 0.7
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Draw Streamer Cutout (if enabled)
    if (project.showStreamerCutout && project.streamerImage) {
      const streamerImg = new Image();
      streamerImg.crossOrigin = 'anonymous';
      streamerImg.onload = () => {
        ctx.save();
        const streamerW = 560;
        const streamerH = 560;
        let streamerX = width - streamerW - 20;
        if (project.streamerPosition === 'left') streamerX = 20;
        if (project.streamerPosition === 'center') streamerX = (width - streamerW) / 2;
        const streamerY = height - streamerH + 20;

        // Glowing outline/shadow for streamer cutout
        if (project.streamerGlow) {
          ctx.shadowColor = project.borderGlowColor || '#53fc18';
          ctx.shadowBlur = 35;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Clip to circle/rounded shape or direct draw
        ctx.drawImage(streamerImg, streamerX, streamerY, streamerW, streamerH);
        ctx.restore();

        // 4. Draw Typography & Badges on top
        drawTextAndOverlays(ctx, width, height);
      };
      streamerImg.onerror = () => {
        drawTextAndOverlays(ctx, width, height);
      };
      streamerImg.src = project.streamerImage;
    } else {
      drawTextAndOverlays(ctx, width, height);
    }
  };

  const drawTextAndOverlays = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();

    // 4A. Border Glow Accent
    if (project.showBorders) {
      ctx.lineWidth = 14;
      ctx.strokeStyle = project.borderGlowColor;
      ctx.strokeRect(7, 7, width - 14, height - 14);
    }

    // 4B. Top Badge
    if (project.badgeText) {
      const badgeX = 60;
      const badgeY = 60;
      ctx.font = '900 28px "Outfit", sans-serif';
      const textMetrics = ctx.measureText(project.badgeText);
      const paddingX = 24;
      const badgeH = 50;

      // Badge background pill
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, textMetrics.width + paddingX * 2, badgeH, 8);
      ctx.fill();

      // Badge text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(project.badgeText, badgeX + paddingX, badgeY + badgeH / 2);
    }

    // 4C. Main Bold Headline
    if (project.headlineText) {
      const textX = 60;
      const textY = 220;

      ctx.save();
      ctx.font = '900 86px "Anton", "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Heavy drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;

      // Heavy black stroke
      ctx.lineWidth = 14;
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      ctx.strokeStyle = project.headlineStroke || '#000000';
      ctx.strokeText(project.headlineText, textX, textY);

      // Gradient / Fill Text
      const textGrad = ctx.createLinearGradient(textX, textY, textX, textY + 90);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(1, '#facc15'); // energetic streamer yellow
      ctx.fillStyle = textGrad;
      ctx.fillText(project.headlineText, textX, textY);
      ctx.restore();
    }

    // 4D. Secondary Subline
    if (project.sublineText) {
      const subX = 60;
      const subY = 330;

      ctx.save();
      ctx.font = '800 48px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Outline
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(project.sublineText, subX, subY);

      ctx.fillStyle = '#53fc18'; // Kick neon green
      ctx.fillText(project.sublineText, subX, subY);
      ctx.restore();
    }

    // 4E. Platform Badges: Kick & Twitch Logos
    let logoX = 60;
    const logoY = height - 110;

    if (stickerTwitch) {
      // Twitch badge
      ctx.fillStyle = '#9146ff';
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, 150, 48, 8);
      ctx.fill();

      ctx.font = '800 22px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TWITCH', logoX + 75, logoY + 24);
      logoX += 170;
    }

    if (stickerKick) {
      // Kick badge
      ctx.fillStyle = '#53fc18';
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, 130, 48, 8);
      ctx.fill();

      ctx.font = '900 22px "Outfit", sans-serif';
      ctx.fillStyle = '#0a0a0f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KICK', logoX + 65, logoY + 24);
    }

    ctx.restore();
  };

  // Generate AI Concepts via Gemini API
  const handleGenerateAiConcepts = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/thumbnail-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicKeywords,
          category: 'Gaming / Stream',
          streamerStyle
        })
      });
      const data = await res.json();
      if (data && data.concepts) {
        setAiConcepts(data.concepts);
      }
    } catch (err) {
      console.error('Error getting AI thumbnail concepts:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Generate AI Background Image with Gemini Imagen
  const handleGenerateAiImage = async () => {
    setIsGeneratingAiImage(true);
    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Epic gaming broadcast wallpaper backdrop: ${topicKeywords}, high production value, volumetric lighting, 8k render`,
          aspectRatio: '16:9'
        })
      });
      const data = await res.json();
      if (data && data.imageUrl) {
        setProject(prev => ({
          ...prev,
          backgroundImageUrl: data.imageUrl,
          backgroundType: 'image'
        }));
      }
    } catch (err) {
      console.error('Error generating AI image with Gemini:', err);
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleApplyConcept = (concept: any) => {
    setProject(prev => ({
      ...prev,
      headlineText: concept.titleText,
      sublineText: concept.subText,
      badgeText: concept.badge
    }));
  };

  // Download High-Res Thumbnail
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `stream_thumbnail_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Apply directly to Stream Settings
  const handleApplyToStream = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onApplyThumbnailToStream(dataUrl);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2500);
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'streamer') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (target === 'bg') {
        setProject(prev => ({ ...prev, backgroundImageUrl: result, backgroundType: 'image' }));
      } else {
        setProject(prev => ({ ...prev, streamerImage: result, showStreamerCutout: true }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Estudio Creativo de Miniaturas IA (Kick & Twitch)</span>
          </h2>
          <p className="text-xs text-neutral-400">Crea miniaturas virales 1280x720 HD con IA, recortes de streamer y tipografía de alto impacto</p>
        </div>

        <div className="flex items-center gap-3">
          {appliedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> ¡Miniatura aplicada al directo!
            </span>
          )}

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-neutral-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar HD (PNG)</span>
          </button>

          <button
            onClick={handleApplyToStream}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Establecer como Miniatura de Canal</span>
          </button>
        </div>
      </div>

      {/* Main Studio Deck: Canvas Viewport & Tooling Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 16:9 Canvas Viewport (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800">
              <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Lienzo en Vivo (16:9 · 1280x720)
              </span>
              <span className="font-mono">Resolución Oficial de Broadcast</span>
            </div>

            {/* Canvas Container with dark checkered backdrop */}
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Quick Toggle Overlays */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Pegatinas:</span>
                <button
                  onClick={() => setStickerTwitch(!stickerTwitch)}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${stickerTwitch ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60' : 'bg-neutral-800 text-neutral-400'}`}
                >
                  Logo Twitch
                </button>
                <button
                  onClick={() => setStickerKick(!stickerKick)}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${stickerKick ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-neutral-800 text-neutral-400'}`}
                >
                  Logo Kick
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProject(p => ({ ...p, showBorders: !p.showBorders }))}
                  className={`px-2.5 py-1 rounded text-xs ${project.showBorders ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
                >
                  Borde Neón: {project.showBorders ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setProject(p => ({ ...p, vignette: !p.vignette }))}
                  className={`px-2.5 py-1 rounded text-xs ${project.vignette ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
                >
                  Viñeta: {project.vignette ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Preset Background Gallery */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-neutral-300 block">Fondos Rápidos de Transmisión</span>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_BACKGROUNDS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setProject(p => ({ ...p, backgroundImageUrl: bg.url, backgroundType: 'image' }))}
                  className={`relative aspect-video rounded-lg overflow-hidden border transition-all group ${
                    project.backgroundImageUrl === bg.url
                      ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <img
                    src={bg.url}
                    alt={bg.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[10px] text-white font-medium truncate">{bg.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customization Toolset Tabs (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          
          {/* Subtabs Header */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'ai' ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>IA Gemini</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'text' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Textos</span>
            </button>
            <button
              onClick={() => setActiveTab('streamer')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'streamer' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Streamer</span>
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'adjust' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Filtros</span>
            </button>
          </div>

          {/* TAB 1: AI GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-200">
                  Palabras Clave o Idea del Stream
                </label>
                <input
                  type="text"
                  value={topicKeywords}
                  onChange={(e) => setTopicKeywords(e.target.value)}
                  placeholder="Ej: VALORANT CLUTCH 1v4, NUEVO RECORD, REACCION..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-200">
                  Estilo de Streamer
                </label>
                <select
                  value={streamerStyle}
                  onChange={(e) => setStreamerStyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="Viral High-CTR Esports">Viral High-CTR Esports (Colores Neón & Texto Épico)</option>
                  <option value="Just Chatting Chill React">Just Chatting / Reacción Expresiva</option>
                  <option value="Tournament Final Champion">Final de Torneo / Modo Tryhard</option>
                  <option value="Funny Meme & Moments">Momentos Graciosos & Desafíos Extremos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleGenerateAiConcepts}
                  disabled={isGeneratingAi}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingAi ? 'Pensando...' : 'Generar Ideas IA'}</span>
                </button>

                <button
                  onClick={handleGenerateAiImage}
                  disabled={isGeneratingAiImage}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  {isGeneratingAiImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                  <span>{isGeneratingAiImage ? 'Generando...' : 'Fondo IA'}</span>
                </button>
              </div>

              {/* Display Generated Concept Cards */}
              {aiConcepts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <span className="text-xs font-bold text-purple-300 block">Conceptos Creativos Sugeridos:</span>
                  <div className="space-y-2">
                    {aiConcepts.map((concept, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-neutral-950 border border-neutral-800 hover:border-purple-600/50 rounded-lg space-y-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-bold uppercase">
                            {concept.badge}
                          </span>
                          <button
                            onClick={() => handleApplyConcept(concept)}
                            className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                          >
                            <span>Cargar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-sm font-black text-white">{concept.titleText}</div>
                        <div className="text-xs text-emerald-400 font-semibold">{concept.subText}</div>
                        <div className="text-[11px] text-neutral-400">Expresión: {concept.emotion} · Paleta: {concept.palette}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT & TYPOGRAPHY */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Texto Principal (Gran Título)
                </label>
                <input
                  type="text"
                  value={project.headlineText}
                  onChange={(e) => setProject(p => ({ ...p, headlineText: e.target.value }))}
                  placeholder="¡EL MEJOR MOMENTO!"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Texto Secundario (Subtítulo)
                </label>
                <input
                  type="text"
                  value={project.sublineText}
                  onChange={(e) => setProject(p => ({ ...p, sublineText: e.target.value }))}
                  placeholder="VALORANT RADIANT 1v4"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Etiqueta Superior (Badge de Alerta)
                </label>
                <input
                  type="text"
                  value={project.badgeText}
                  onChange={(e) => setProject(p => ({ ...p, badgeText: e.target.value }))}
                  placeholder="RECORD MUNDIAL, NUEVO DROP..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Color del Borde Neón
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={project.borderGlowColor}
                    onChange={(e) => setProject(p => ({ ...p, borderGlowColor: e.target.value }))}
                    className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-neutral-300">{project.borderGlowColor}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STREAMER CUTOUT & AVATAR */}
          {activeTab === 'streamer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">Mostrar Recorte de Streamer</span>
                <input
                  type="checkbox"
                  checked={project.showStreamerCutout}
                  onChange={(e) => setProject(p => ({ ...p, showStreamerCutout: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {project.showStreamerCutout && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-neutral-200">
                      Posición en la Miniatura
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['left', 'center', 'right'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setProject(p => ({ ...p, streamerPosition: pos }))}
                          className={`py-1.5 rounded-lg text-xs font-bold capitalize ${
                            project.streamerPosition === pos
                              ? 'bg-emerald-500 text-neutral-950'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {pos === 'left' ? 'Izquierda' : pos === 'right' ? 'Derecha' : 'Centro'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200">Efecto Resplandor Neón Silueta</span>
                    <input
                      type="checkbox"
                      checked={project.streamerGlow}
                      onChange={(e) => setProject(p => ({ ...p, streamerGlow: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Upload custom streamer picture */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-neutral-200 mb-1">
                      Subir Foto de Reacción Personalizada
                    </label>
                    <label className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-700 hover:border-emerald-400 rounded-lg cursor-pointer bg-neutral-950 text-xs text-neutral-300 transition-colors">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Seleccionar archivo (PNG o JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImage(e, 'streamer')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: IMAGE FILTERS & TUNING */}
          {activeTab === 'adjust' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Brillo</span>
                  <span className="font-mono">{project.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={project.brightness}
                  onChange={(e) => setProject(p => ({ ...p, brightness: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Contraste</span>
                  <span className="font-mono">{project.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={project.contrast}
                  onChange={(e) => setProject(p => ({ ...p, contrast: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Saturación Neón</span>
                  <span className="font-mono">{project.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={project.saturation}
                  onChange={(e) => setProject(p => ({ ...p, saturation: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Subir Fondo Personalizado
                </label>
                <label className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-700 hover:border-emerald-400 rounded-lg cursor-pointer bg-neutral-950 text-xs text-neutral-300 transition-colors">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Subir captura de tu juego o cámara</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImage(e, 'bg')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
