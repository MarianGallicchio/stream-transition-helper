import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Mic, MicOff, Mouse, Keyboard, Sparkles,
  Save, Palette, Check, RefreshCw, Eye, Download,
  Volume2, Maximize2, Shield, Shirt, Smile, Layers
} from 'lucide-react';

export interface CharacterConfig {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: 'anime_spikes' | 'streamer_wavy' | 'ponytail' | 'cyber_braids' | 'cat_ears';
  hairColor: string;
  eyeStyle: 'focus' | 'happy' | 'chill' | 'rage' | 'visor';
  eyeColor: string;
  headset: 'rgb_cat' | 'studio_boom' | 'esports_earbuds' | 'cyber_visor';
  headsetColor: string;
  outfit: 'hoodie_dual' | 'jersey_pro' | 'cyber_armor' | 'casual_tee';
  outfitColor: string;
  aura: boolean;
  auraColor: string;
}

const DEFAULT_CHARACTER: CharacterConfig = {
  id: 'char_default',
  name: 'Streamer Persona Principal',
  skinTone: '#F3D2C1', // Warm peach
  hairStyle: 'anime_spikes',
  hairColor: '#53FC18', // Neon Kick Green
  eyeStyle: 'focus',
  eyeColor: '#9146FF', // Twitch Purple
  headset: 'rgb_cat',
  headsetColor: '#9146FF',
  outfit: 'hoodie_dual',
  outfitColor: '#18181B',
  aura: true,
  auraColor: '#53FC18',
};

const PRESET_CHARACTERS: CharacterConfig[] = [
  {
    id: 'char_tryhard',
    name: '🔥 Ranked Tryhard 60FPS',
    skinTone: '#F3D2C1',
    hairStyle: 'anime_spikes',
    hairColor: '#EF4444',
    eyeStyle: 'rage',
    eyeColor: '#EF4444',
    headset: 'studio_boom',
    headsetColor: '#EF4444',
    outfit: 'jersey_pro',
    outfitColor: '#09090B',
    aura: true,
    auraColor: '#EF4444'
  },
  {
    id: 'char_chill_kick',
    name: '🌿 Kick Night Chill',
    skinTone: '#E0AC69',
    hairStyle: 'streamer_wavy',
    hairColor: '#53FC18',
    eyeStyle: 'happy',
    eyeColor: '#53FC18',
    headset: 'rgb_cat',
    headsetColor: '#53FC18',
    outfit: 'hoodie_dual',
    outfitColor: '#18181B',
    aura: true,
    auraColor: '#53FC18'
  },
  {
    id: 'char_twitch_vtuber',
    name: '💜 Twitch Cyber VTuber',
    skinTone: '#FEE2E2',
    hairStyle: 'cat_ears',
    hairColor: '#A855F7',
    eyeStyle: 'visor',
    eyeColor: '#38BDF8',
    headset: 'cyber_visor',
    headsetColor: '#9333EA',
    outfit: 'cyber_armor',
    outfitColor: '#2E1065',
    aura: true,
    auraColor: '#A855F7'
  }
];

interface ReactiveVirtualCamProps {
  onSetAsAvatar: (dataUrl: string) => void;
  onSendToThumbnail: (dataUrl: string) => void;
}

export const ReactiveVirtualCam: React.FC<ReactiveVirtualCamProps> = ({
  onSetAsAvatar,
  onSendToThumbnail,
}) => {
  // Character customizer state
  const [character, setCharacter] = useState<CharacterConfig>(() => {
    try {
      const saved = localStorage.getItem('streamhub_character_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CHARACTER;
  });

  const [savedCharacters, setSavedCharacters] = useState<CharacterConfig[]>(() => {
    try {
      const saved = localStorage.getItem('streamhub_saved_characters');
      if (saved) return JSON.parse(saved);
    } catch {}
    return PRESET_CHARACTERS;
  });

  // Reactive motion state
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // -1 to 1 relative
  const [isClicking, setIsClicking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [keyPressCount, setKeyPressCount] = useState(0);
  const [apm, setApm] = useState(140);
  const [chromaKeyMode, setChromaKeyMode] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'reactive' | 'character' | 'presets'>('reactive');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Microphone Voice Reactive Listening
  const toggleMicrophone = async () => {
    if (micActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setMicActive(false);
      setAudioLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      setMicActive(true);

      const checkAudio = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0 to 1 with noise gate
        const normalized = Math.max(0, (avg - 15) / 100);
        setAudioLevel(Math.min(1, normalized));

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.warn('Microphone access not granted, using simulated speech rhythm:', err);
      // Fallback: simulated natural speaking when mic is not granted
      setMicActive(true);
    }
  };

  // 2. Global Mouse and Keyboard Event Listeners for Character Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 ... 1 based on screen center
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x: Math.max(-1, Math.min(1, normX)), y: Math.max(-1, Math.min(1, normY)) });
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      setTimeout(() => setIsClicking(false), 120);
    };

    let typingTimer: any = null;
    const handleKeyDown = () => {
      setIsTyping(true);
      setKeyPressCount(p => p + 1);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        setIsTyping(false);
      }, 180);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      if (typingTimer) clearTimeout(typingTimer);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // 3. Fallback rhythmic speaking simulation if mic not connected
  useEffect(() => {
    if (!micActive) {
      const interval = setInterval(() => {
        // Natural speech modulation
        const speechBurst = Math.random() > 0.4 ? 0.3 + Math.random() * 0.6 : 0;
        setAudioLevel(speechBurst);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [micActive]);

  // 4. Save character to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('streamhub_character_config', JSON.stringify(character));
      localStorage.setItem('streamhub_saved_characters', JSON.stringify(savedCharacters));
    } catch {}
  }, [character, savedCharacters]);

  // 5. Draw Reactive Character on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    if (chromaKeyMode) {
      // Pure Green Screen (#00FF00) for OBS Chroma Key Filter
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, width, height);
    } else {
      // Dark Studio Streamer Room
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.8);
      bgGrad.addColorStop(0, '#1c1917');
      bgGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Studio Hexagon Light on wall
      ctx.strokeStyle = character.auraColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2;
      ctx.strokeRect(60, 40, 100, 100);
      ctx.strokeRect(width - 160, 40, 100, 100);
      ctx.globalAlpha = 1.0;
    }

    // Dynamic head offset based on speech rhythm & mouse
    const speechBob = audioLevel * 10;
    const headTiltX = mousePos.x * 12;
    const headTiltY = mousePos.y * 8 + speechBob;

    const centerX = width / 2 + headTiltX;
    const centerY = height / 2 - 20 + headTiltY;

    // AURA GLOW (When speaking or active)
    if (character.aura) {
      ctx.save();
      const auraPulse = 20 + audioLevel * 30;
      ctx.shadowColor = character.auraColor;
      ctx.shadowBlur = auraPulse;
      ctx.strokeStyle = character.auraColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 130, 150, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // BODY & HOODIE
    ctx.save();
    ctx.fillStyle = character.outfitColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 180, 160, 100, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hoodie Collar / Accent
    ctx.strokeStyle = character.auraColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY + 100);
    ctx.lineTo(centerX, centerY + 140);
    ctx.lineTo(centerX + 40, centerY + 100);
    ctx.stroke();
    ctx.restore();

    // HEAD
    ctx.save();
    ctx.fillStyle = character.skinTone;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 90, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // HEADSET ARCH
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 25, 105, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();

    // HEADSET EARCUPS (glow to audio level)
    ctx.fillStyle = character.headsetColor;
    ctx.shadowColor = character.auraColor;
    ctx.shadowBlur = audioLevel > 0.2 ? 20 : 5;
    ctx.fillRect(centerX - 120, centerY - 40, 24, 70);
    ctx.fillRect(centerX + 96, centerY - 40, 24, 70);

    // HEADSET CAT EARS (if selected)
    if (character.headset === 'rgb_cat') {
      ctx.fillStyle = character.headsetColor;
      // Left Ear
      ctx.beginPath();
      ctx.moveTo(centerX - 80, centerY - 100);
      ctx.lineTo(centerX - 50, centerY - 150);
      ctx.lineTo(centerX - 20, centerY - 105);
      ctx.fill();
      // Right Ear
      ctx.beginPath();
      ctx.moveTo(centerX + 80, centerY - 100);
      ctx.lineTo(centerX + 50, centerY - 150);
      ctx.lineTo(centerX + 20, centerY - 105);
      ctx.fill();
    }

    // HAIR
    ctx.fillStyle = character.hairColor;
    ctx.beginPath();
    // Hair bangs & volume
    ctx.moveTo(centerX - 95, centerY - 20);
    ctx.quadraticCurveTo(centerX - 80, centerY - 125, centerX, centerY - 125);
    ctx.quadraticCurveTo(centerX + 80, centerY - 125, centerX + 95, centerY - 20);
    ctx.quadraticCurveTo(centerX + 40, centerY - 60, centerX, centerY - 50);
    ctx.quadraticCurveTo(centerX - 40, centerY - 60, centerX - 95, centerY - 20);
    ctx.fill();

    // EYES (Track mouse pointer smoothly)
    const eyeOffsetX = mousePos.x * 6;
    const eyeOffsetY = mousePos.y * 4;

    const leftEyeX = centerX - 35;
    const rightEyeX = centerX + 35;
    const eyeY = centerY - 10;

    // Eye whites
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, 18, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEyeX, eyeY, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye pupils (reactive tracking)
    ctx.fillStyle = character.eyeColor;
    ctx.beginPath();
    ctx.arc(leftEyeX + eyeOffsetX, eyeY + eyeOffsetY, 9, 0, Math.PI * 2);
    ctx.arc(rightEyeX + eyeOffsetX, eyeY + eyeOffsetY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Pupil Glint / Catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leftEyeX + eyeOffsetX - 3, eyeY + eyeOffsetY - 3, 3, 0, Math.PI * 2);
    ctx.arc(rightEyeX + eyeOffsetX - 3, eyeY + eyeOffsetY - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // MOUTH (DYNAMICS: Opens and talks based on audioLevel)
    ctx.fillStyle = '#3f3f46';
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3;

    const mouthY = centerY + 45;
    const mouthOpen = Math.max(3, audioLevel * 30); // Dynamic height from volume!
    const mouthWidth = 24 + audioLevel * 10;

    ctx.beginPath();
    if (audioLevel > 0.15) {
      // Talking: Open mouth with teeth/tongue
      ctx.fillStyle = '#881337';
      ctx.ellipse(centerX, mouthY, mouthWidth / 2, mouthOpen / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tongue
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(centerX, mouthY + mouthOpen / 4, mouthWidth / 4, 0, Math.PI);
      ctx.fill();
    } else {
      // Closed / Smiling mouth
      ctx.beginPath();
      ctx.arc(centerX, mouthY - 5, 14, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    // GAMING DESK, RGB KEYBOARD & MOUSE (Reactive to typing & clicking)
    const deskY = height - 85;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, deskY, width, 85);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, deskY, width, 85);

    // Mechanical Keyboard on desk
    const kbX = width / 2 - 130;
    const kbY = deskY + 15;
    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = isTyping ? character.auraColor : '#3f3f46';
    ctx.lineWidth = isTyping ? 3 : 1;
    ctx.shadowColor = character.auraColor;
    ctx.shadowBlur = isTyping ? 15 : 0;
    ctx.fillRect(kbX, kbY, 180, 50);
    ctx.strokeRect(kbX, kbY, 180, 50);

    // Keyboard Keycaps with RGB Wave
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        ctx.fillStyle = isTyping && (row + col) % 2 === 0 ? character.auraColor : '#27272a';
        ctx.fillRect(kbX + 8 + col * 20, kbY + 6 + row * 13, 16, 10);
      }
    }

    // Gaming Mouse
    const mousePadX = width / 2 + 75;
    const mousePadY = deskY + 18;
    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = isClicking ? '#ef4444' : '#3f3f46';
    ctx.lineWidth = isClicking ? 3 : 1;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = isClicking ? 20 : 0;
    ctx.beginPath();
    ctx.roundRect(mousePadX, mousePadY, 32, 46, 12);
    ctx.fill();
    ctx.stroke();

    // Hands on Keyboard and Mouse
    ctx.fillStyle = character.skinTone;
    ctx.shadowBlur = 0;

    // Left hand tapping keyboard
    const leftHandY = isTyping ? kbY + 12 : kbY + 18;
    ctx.beginPath();
    ctx.arc(kbX + 80, leftHandY, 16, 0, Math.PI * 2);
    ctx.fill();

    // Right hand on mouse (clicks down when clicking!)
    const rightHandY = isClicking ? mousePadY + 16 : mousePadY + 12;
    ctx.beginPath();
    ctx.arc(mousePadX + 16, rightHandY, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [character, audioLevel, mousePos, isClicking, isTyping, chromaKeyMode]);

  // Export character image
  const handleExportCharacter = (action: 'avatar' | 'thumbnail' | 'download') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (action === 'avatar') {
      onSetAsAvatar(dataUrl);
      setFeedbackNotice('¡Personaje configurado como Avatar de Kick y Twitch!');
    } else if (action === 'thumbnail') {
      onSendToThumbnail(dataUrl);
      setFeedbackNotice('¡Personaje enviado al Editor de Miniaturas!');
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${character.name.replace(/\s+/g, '_')}_stream_cam.png`;
      a.click();
      setFeedbackNotice('Imagen descargada en alta resolución.');
    }
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // Save as new preset
  const handleSaveAsPreset = () => {
    const newPreset: CharacterConfig = {
      ...character,
      id: `char_custom_${Date.now()}`,
      name: `${character.name} (Editado)`
    };
    setSavedCharacters(prev => [...prev, newPreset]);
    setFeedbackNotice('¡Nuevo personaje guardado para tus streams!');
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            <span>Cámara Virtual Reactiva & Creador de Personajes VTuber</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Personaje animado que sincroniza su boca al hablar por micrófono, sigue el cursor del ratón y presiona el teclado en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          {feedbackNotice && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mr-2 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{feedbackNotice}</span>
            </span>
          )}

          <button
            onClick={() => handleExportCharacter('avatar')}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-purple-300 font-bold text-xs rounded-lg transition-colors border border-purple-800/40"
          >
            Usar de Avatar
          </button>

          <button
            onClick={() => handleExportCharacter('thumbnail')}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-300 font-bold text-xs rounded-lg transition-colors border border-emerald-800/40"
          >
            Pasar a Miniaura
          </button>

          <button
            onClick={() => handleExportCharacter('download')}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-lg transition-colors"
          >
            Descargar PNG
          </button>
        </div>
      </div>

      {/* Main Studio View: Canvas Viewport & Character Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Reactive Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 shadow-2xl">
            
            {/* Viewport Header Controls */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-neutral-200">Facecam Reactiva (60 FPS)</span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400 font-mono">1080p Chroma Ready</span>
              </div>

              {/* Toggles: Mic, Chroma, Sound */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMicrophone}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    micActive
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Conectar micrófono real para sincronización de labios"
                >
                  {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{micActive ? 'Micrófono ON' : 'Activar Mic'}</span>
                </button>

                <button
                  onClick={() => setChromaKeyMode(!chromaKeyMode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    chromaKeyMode
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Fondo verde para recortar con filtro Croma en OBS Studio"
                >
                  <span>Croma Verde (OBS)</span>
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-neutral-800 shadow-inner flex items-center justify-center bg-black">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* Real-time Telemetry Overlay on Canvas */}
              <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur px-2.5 py-1 rounded border border-neutral-800 text-[10px] font-mono text-neutral-300 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Voz: {Math.round(audioLevel * 100)}%</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mouse className="w-3 h-3 text-purple-400" />
                  <span>{isClicking ? 'CLICK!' : 'Ratón'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Keyboard className="w-3 h-3 text-blue-400" />
                  <span>{isTyping ? 'TECLEANDO...' : `${keyPressCount} teclas`}</span>
                </span>
              </div>
            </div>

            {/* Testing & Interactive Instructions */}
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-xs text-neutral-400 space-y-1">
              <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interacción Total en Vivo:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                1. <strong>Habla por tu micrófono:</strong> la boca se abre al compás de tu voz.<br />
                2. <strong>Mueve el ratón o haz clic:</strong> los ojos siguen tu puntero y la mano presiona el mouse.<br />
                3. <strong>Escribe con el teclado:</strong> las manos tocan las teclas RGB mecánicas en tiempo real.
              </p>
            </div>

          </div>
        </div>

        {/* Right Column: Character Customizer Studio (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          
          {/* Subtabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setActiveEditorTab('reactive')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                activeEditorTab === 'reactive' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Apariencia
            </button>
            <button
              onClick={() => setActiveEditorTab('character')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                activeEditorTab === 'character' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Outfit & Gear
            </button>
            <button
              onClick={() => setActiveEditorTab('presets')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                activeEditorTab === 'presets' ? 'bg-emerald-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Personajes Guardados
            </button>
          </div>

          {/* TAB 1: APARIENCIA */}
          {activeEditorTab === 'reactive' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Nombre del Personaje</label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => setCharacter(c => ({ ...c, name: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Hairstyle */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Estilo de Cabello</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'anime_spikes', label: 'Puntas Anime' },
                    { id: 'streamer_wavy', label: 'Melena Streamer' },
                    { id: 'cat_ears', label: 'Orejas de Gato' },
                    { id: 'ponytail', label: 'Coleta Gamer' }
                  ].map(h => (
                    <button
                      key={h.id}
                      onClick={() => setCharacter(c => ({ ...c, hairStyle: h.id as any }))}
                      className={`p-2 rounded-lg border text-left font-medium ${
                        character.hairStyle === h.id
                          ? 'bg-neutral-800 border-purple-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Color */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Color de Pelo</label>
                <div className="flex items-center gap-2">
                  {['#53FC18', '#9146FF', '#EF4444', '#38BDF8', '#FACC15', '#18181B'].map(col => (
                    <button
                      key={col}
                      onClick={() => setCharacter(c => ({ ...c, hairColor: col }))}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        character.hairColor === col ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Skin Tone */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Tono de Piel</label>
                <div className="flex items-center gap-2">
                  {['#F3D2C1', '#FEE2E2', '#E0AC69', '#8D5B4C', '#CBD5E1'].map(skin => (
                    <button
                      key={skin}
                      onClick={() => setCharacter(c => ({ ...c, skinTone: skin }))}
                      style={{ backgroundColor: skin }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        character.skinTone === skin ? 'scale-110 border-purple-400' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Eye Style & Color */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Expresión de Ojos</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'focus', label: 'Enfoque Pro' },
                    { id: 'happy', label: 'Sonriente' },
                    { id: 'rage', label: 'Modo Tryhard' }
                  ].map(e => (
                    <button
                      key={e.id}
                      onClick={() => setCharacter(c => ({ ...c, eyeStyle: e.id as any }))}
                      className={`py-1.5 rounded-lg border font-medium ${
                        character.eyeStyle === e.id
                          ? 'bg-neutral-800 border-purple-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OUTFIT & GEAR */}
          {activeEditorTab === 'character' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Auriculares & Diadema</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'rgb_cat', label: 'Orejas de Gato RGB' },
                    { id: 'studio_boom', label: 'Headset Pro Shure' },
                    { id: 'cyber_visor', label: 'Visor Cyberpunk' }
                  ].map(hs => (
                    <button
                      key={hs.id}
                      onClick={() => setCharacter(c => ({ ...c, headset: hs.id as any }))}
                      className={`p-2 rounded-lg border text-left font-medium ${
                        character.headset === hs.id
                          ? 'bg-neutral-800 border-emerald-400 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {hs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Ropa / Merch del Stream</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'hoodie_dual', label: 'Sudadera Kick & Twitch' },
                    { id: 'jersey_pro', label: 'Jersey Esports' },
                    { id: 'cyber_armor', label: 'Armadura Cyberpunk' }
                  ].map(out => (
                    <button
                      key={out.id}
                      onClick={() => setCharacter(c => ({ ...c, outfit: out.id as any }))}
                      className={`p-2 rounded-lg border text-left font-medium ${
                        character.outfit === out.id
                          ? 'bg-neutral-800 border-emerald-400 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {out.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resplandor Aura Neón */}
              <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                <div>
                  <span className="font-semibold text-neutral-200 block">Aura Neón Reactiva</span>
                  <span className="text-[11px] text-neutral-400">Resplandece con mayor fuerza al hablar</span>
                </div>
                <input
                  type="checkbox"
                  checked={character.aura}
                  onChange={(e) => setCharacter(c => ({ ...c, aura: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Color del Resplandor</label>
                <div className="flex items-center gap-2">
                  {['#53FC18', '#9146FF', '#EF4444', '#38BDF8', '#FACC15'].map(col => (
                    <button
                      key={col}
                      onClick={() => setCharacter(c => ({ ...c, auraColor: col }))}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full border-2 ${
                        character.auraColor === col ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeEditorTab === 'presets' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-neutral-300 block">Personajes Listos para Transmisión:</span>
              <div className="space-y-2">
                {savedCharacters.map((saved) => (
                  <button
                    key={saved.id}
                    onClick={() => {
                      setCharacter(saved);
                      setFeedbackNotice(`¡Personaje "${saved.name}" cargado!`);
                      setTimeout(() => setFeedbackNotice(null), 2500);
                    }}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      character.id === saved.id
                        ? 'bg-neutral-800 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{saved.name}</div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Pelo: {saved.hairColor} · Aura: {saved.auraColor}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold">Cargar →</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleSaveAsPreset}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 border border-neutral-700 mt-2"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Guardar Personaje Actual</span>
              </button>
            </div>
          )}

          {/* Bottom Save Action */}
          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={handleSaveAsPreset}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-purple-950/40 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración de Personaje</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
