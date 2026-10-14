import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, Volume2, MessageSquare, Zap, Sparkles, Scissors,
  Download, Check, RefreshCw, Settings, Sliders, ExternalLink,
  Play, Copy, Trash2, Clock, Share2, Tag, ChevronDown, CheckCircle2
} from 'lucide-react';
import { HighlightSegment, HighlightDetectorSettings, AudioChannel, UnifiedChatMessage, OBSState } from '../types/stream';
import { obsController } from '../services/obsController';

interface HighlightDetectorManagerProps {
  obsState: OBSState;
  chatMessages: UnifiedChatMessage[];
  gameCategory: string;
  onSendToThumbnail?: (title: string, backgroundUrl: string) => void;
  onShowToast: (message: string) => void;
}

const DEFAULT_SETTINGS: HighlightDetectorSettings = {
  enabled: true,
  audioThresholdDb: -4.0, // High decibel spike threshold
  chatVelocityThreshold: 12, // Messages in last 20 seconds
  autoTriggerReplayBuffer: true,
  clipDurationSeconds: 30,
  cooldownSeconds: 15,
};

// Sin highlights de ejemplo: la lista empieza vacía y solo se llena con marcadores reales.
const INITIAL_HIGHLIGHTS: HighlightSegment[] = [];

export const HighlightDetectorManager: React.FC<HighlightDetectorManagerProps> = ({
  obsState,
  chatMessages,
  gameCategory,
  onSendToThumbnail,
  onShowToast,
}) => {
  const [highlights, setHighlights] = useState<HighlightSegment[]>(INITIAL_HIGHLIGHTS);
  const [settings, setSettings] = useState<HighlightDetectorSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'chat' | 'manual'>('all');

  // Real-time Detection State
  const [currentAudioPeakDb, setCurrentAudioPeakDb] = useState(-18.0);
  const [currentAudioPeakPct, setCurrentAudioPeakPct] = useState(30);
  const [chatVelocity, setChatVelocity] = useState(4); // msgs / 20s
  const [hypeIndex, setHypeIndex] = useState(32); // 0-100%
  const [isSpikeActive, setIsSpikeActive] = useState(false);
  const [lastTriggerTime, setLastTriggerTime] = useState(0);

  // AI Modal & Trimmer Modal State
  const [selectedHighlightForAI, setSelectedHighlightForAI] = useState<HighlightSegment | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    titles: string[];
    summary: string;
    tags: string[];
    tiktokHashtags: string[];
    thumbnailIdea: string;
  } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Trimmer state
  const [editingHighlight, setEditingHighlight] = useState<HighlightSegment | null>(null);
  const [trimStartOffset, setTrimStartOffset] = useState(-20); // seconds before trigger
  const [trimEndOffset, setTrimEndOffset] = useState(10); // seconds after trigger

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
  };

  // Monitor Mic / Game Audio Channels for Spikes
  useEffect(() => {
    const micChannel = obsState.audioChannels.find(c => c.type === 'mic') || obsState.audioChannels[0];
    if (!micChannel || micChannel.muted) {
      setCurrentAudioPeakDb(-60);
      setCurrentAudioPeakPct(0);
      return;
    }

    const peak = micChannel.peak;
    const peakPct = Math.round(peak * 100);
    // Convert peak to approx dB
    const approxDb = peak === 0 ? -60 : Math.round((20 * Math.log10(Math.max(0.01, peak))) * 10) / 10;

    setCurrentAudioPeakDb(approxDb);
    setCurrentAudioPeakPct(peakPct);

    // Audio spike evaluation
    if (settings.enabled && approxDb >= settings.audioThresholdDb) {
      checkAndTriggerHighlight('audio_spike', `Pico en Micrófono: ${approxDb} dB (Límite: ${settings.audioThresholdDb} dB)`, peakPct);
    }
  }, [obsState.audioChannels, settings]);

  // Monitor Chat Velocity & Keywords
  useEffect(() => {
    // Count messages in recent history
    const now = Date.now();
    const recentMsgs = chatMessages.slice(-15);
    
    // Check for hype keywords in recent chat
    const hypeKeywords = ['clip', 'pog', 'omg', 'gg', 'hype', 'clutch', 'jaja', 'lol', 'wtfff', 'increible', 'dios'];
    let hypeKeywordCount = 0;
    recentMsgs.forEach(m => {
      const lower = m.text.toLowerCase();
      if (hypeKeywords.some(k => lower.includes(k))) {
        hypeKeywordCount += 2;
      }
    });

    const calculatedVelocity = recentMsgs.length + hypeKeywordCount;
    setChatVelocity(calculatedVelocity);

    // Calculate combined Hype Index (0-100%)
    const audioWeight = Math.min(100, Math.max(0, (currentAudioPeakDb + 30) * 3.3));
    const chatWeight = Math.min(100, calculatedVelocity * 4.5);
    const combined = Math.round((audioWeight * 0.5) + (chatWeight * 0.5));
    setHypeIndex(combined);

    // Chat velocity spike evaluation
    if (settings.enabled && calculatedVelocity >= settings.chatVelocityThreshold) {
      checkAndTriggerHighlight(
        'chat_velocity',
        `Oleada de Chat: ${calculatedVelocity} msgs/min (Spam de Hype / Clips)`,
        Math.min(99, combined + 20)
      );
    }
  }, [chatMessages, currentAudioPeakDb, settings]);

  // Highlight Trigger Evaluator with Cooldown and OBS Replay Buffer Sync
  const checkAndTriggerHighlight = (
    type: 'audio_spike' | 'chat_velocity' | 'manual_marker' | 'combo_hype',
    detail: string,
    intensity: number
  ) => {
    const now = Date.now();
    if (type !== 'manual_marker' && now - lastTriggerTime < settings.cooldownSeconds * 1000) {
      return; // Still in cooldown period
    }

    setLastTriggerTime(now);
    setIsSpikeActive(true);
    setTimeout(() => setIsSpikeActive(false), 2500);

    // Trigger OBS Replay Buffer Save if enabled
    let replaySaved = false;
    if (settings.autoTriggerReplayBuffer) {
      replaySaved = obsController.saveReplayBuffer();
    }

    const currentUptime = obsState.stats.uptimeSeconds || 0;
    const formattedTimestamp = formatTime(currentUptime);

    const activeScene = obsState.scenes.find(s => s.id === obsState.activeSceneId)?.name || 'Modo Gaming';
    const recentChatSnippets = chatMessages.slice(-4).map(m => m.text);

    // Auto Title Generation
    let autoTitle = '';
    if (type === 'audio_spike') {
      autoTitle = `😱 ¡REACCIÓN ÉPICA! GRITO EN DIRECTO EN ${gameCategory.toUpperCase()}`;
    } else if (type === 'chat_velocity') {
      autoTitle = `⚡ ¡EL CHAT SE VUELVE LOCO! MOMENTO CLUTCH EN ${gameCategory.toUpperCase()}`;
    } else if (type === 'manual_marker') {
      autoTitle = `🎯 CLIP GUARDADO POR STREAMER: JUGADA EN ${gameCategory.toUpperCase()}`;
    } else {
      autoTitle = `🔥 HIGH ACTIVITY MOMENT: MÁXIMA TENSIÓN EN ${gameCategory.toUpperCase()}`;
    }

    const newSegment: HighlightSegment = {
      id: `hl_${Date.now()}`,
      title: autoTitle,
      streamTimestamp: formattedTimestamp,
      uptimeSeconds: currentUptime,
      durationSeconds: settings.clipDurationSeconds,
      triggerType: type,
      triggerDetail: detail,
      intensity: Math.max(70, Math.min(100, intensity)),
      gameCategory: gameCategory || 'Gaming',
      sceneName: activeScene,
      thumbnailUrl: activeScene.includes('Charla')
        ? '/assets/images/thumbnail_irl_reaction_1791998919984.jpg'
        : '/assets/images/thumbnail_gaming_action_1791998919003.jpg',
      tags: [gameCategory.toLowerCase(), 'highlight', 'clip', 'obs', 'kick', 'twitch'],
      chatSnippet: recentChatSnippets,
      status: 'ready',
      obsReplaySaved: replaySaved,
    };

    setHighlights(prev => [newSegment, ...prev]);

    onShowToast(`⚡ ¡Momento Épico Detectado y Marcado! [${formattedTimestamp}] ${detail}`);
  };

  // Manual Trigger Button (único método sin simulación)
  const handleManualMark = () => {
    checkAndTriggerHighlight('manual_marker', 'Marcador manual (momento real marcado por el streamer)', 95);
  };

  // Request AI Titles & Social Info via Gemini
  const handleRequestAiInfo = async (highlight: HighlightSegment) => {
    setSelectedHighlightForAI(highlight);
    setIsAiLoading(true);
    setAiSuggestions(null);

    try {
      const response = await fetch('/api/gemini/generate-highlight-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: highlight.triggerType,
          gameCategory: highlight.gameCategory,
          sceneName: highlight.sceneName,
          intensity: highlight.intensity,
          chatSnippet: highlight.chatSnippet,
          notes: highlight.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data);
      } else {
        throw new Error('Fallback required');
      }
    } catch {
      // Fallback
      setAiSuggestions({
        titles: [
          `😱 ¡NO PUEDE SER! EL MOMENTO MÁS LOCO EN ${highlight.gameCategory.toUpperCase()}`,
          `🔥 ¡CLIP VIRAL! CUANDO TODO SALIÓ PERFECTO EN DIRECTO`,
          `⚡ JUGADA HISTÓRICA EN KICK & TWITCH | ${highlight.streamTimestamp}`
        ],
        summary: `Clip capturado en la transmisión durante la partida de ${highlight.gameCategory}. Gran momento de hype compartido con la comunidad.`,
        tags: [highlight.gameCategory.toLowerCase(), 'clip', 'streamer', 'highlight', 'viral'],
        tiktokHashtags: [`#${highlight.gameCategory.toLowerCase()}`, '#gamingclips', '#twitchhighlights', '#kickstreamer'],
        thumbnailIdea: 'Gesto de shock con borde neón verde Kick y título en tipografía bold amarilla.'
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Apply chosen AI title to segment
  const handleApplyTitle = (newTitle: string) => {
    if (!selectedHighlightForAI) return;
    setHighlights(prev => prev.map(h => h.id === selectedHighlightForAI.id ? { ...h, title: newTitle } : h));
    setSelectedHighlightForAI(prev => prev ? { ...prev, title: newTitle } : null);
    onShowToast('¡Título del clip actualizado con éxito!');
  };

  // Delete segment
  const handleDeleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    onShowToast('Segmento de highlight eliminado.');
  };

  // Export Clip Metadata to clipboard or file
  const handleExportClipInfo = (highlight: HighlightSegment) => {
    const textToCopy = `🎬 [CLIP / HIGHLIGHT STREAM]
Título: ${highlight.title}
Marca de Tiempo: ${highlight.streamTimestamp}
Duración: ${highlight.durationSeconds}s
Juego: ${highlight.gameCategory}
Motivo: ${highlight.triggerDetail}
Etiquetas: #${highlight.tags.join(' #')}
OBS Replay Buffer: ${highlight.obsReplaySaved ? 'Guardado en disco' : 'Pendiente'}`;

    navigator.clipboard.writeText(textToCopy);
    onShowToast('¡Metadatos del clip copiados al portapapeles!');
  };

  // Download EDL / JSON for Premiere Pro or DaVinci Resolve
  const handleDownloadEdlJson = (highlight: HighlightSegment) => {
    const exportData = {
      streamTitle: highlight.title,
      timestamp: highlight.streamTimestamp,
      inPointSeconds: Math.max(0, highlight.uptimeSeconds - 20),
      outPointSeconds: highlight.uptimeSeconds + 10,
      durationSeconds: highlight.durationSeconds,
      trigger: highlight.triggerType,
      intensity: highlight.intensity,
      game: highlight.gameCategory,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlight_${highlight.streamTimestamp.replace(/:/g, '-')}_${highlight.gameCategory}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Archivo de marcadores JSON descargado para tu editor de video.');
  };

  // Filtered highlights list
  const filteredHighlights = highlights.filter(h => {
    if (filterType === 'audio') return h.triggerType === 'audio_spike';
    if (filterType === 'chat') return h.triggerType === 'chat_velocity';
    if (filterType === 'manual') return h.triggerType === 'manual_marker';
    return true;
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6 shadow-xl">
      
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg transition-colors ${
              isSpikeActive ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-400 animate-pulse' : 'bg-purple-950/60 text-purple-400'
            }`}>
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">
                  Detector Automático de Momentos Épicos & Clips
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 font-bold">
                  OBS Replay Sync
                </span>
                {isSpikeActive && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-600 text-white font-black animate-bounce">
                    ¡PICO DETECTADO!
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Monitorea picos de decibeles de micrófono y volumen de chat para marcar y cortar highlights automáticamente en OBS
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions: Settings & Manual Marker */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Ajustar umbrales y sensibilidad"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleManualMark}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-lg transition-all shadow-lg shadow-amber-900/30 uppercase tracking-wide cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Marcar Clip Ahora</span>
          </button>
        </div>
      </div>

      {/* Real-time Activity Radar & Gauges Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Gauge 1: Audio Spike Radar */}
        <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Decibeles Audio (Micrófono)</span>
            </span>
            <span className={`font-mono font-bold text-xs ${
              currentAudioPeakDb >= settings.audioThresholdDb ? 'text-red-400 animate-pulse' : 'text-neutral-400'
            }`}>
              {currentAudioPeakDb.toFixed(1)} dB
            </span>
          </div>

          {/* Decibel Bar Meter with Threshold Line */}
          <div className="space-y-1">
            <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden relative border border-neutral-800">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  currentAudioPeakDb >= settings.audioThresholdDb
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, currentAudioPeakPct))}%` }}
              />
              {/* Threshold indicator marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                style={{ left: `${Math.min(95, Math.max(10, ((settings.audioThresholdDb + 24) / 24) * 100))}%` }}
                title={`Umbral: ${settings.audioThresholdDb} dB`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-0.5">
              <span>-24 dB</span>
              <span className="text-red-400 font-semibold">Umbral ({settings.audioThresholdDb} dB)</span>
              <span>0 dB</span>
            </div>
          </div>
        </div>

        {/* Gauge 2: Chat Velocity & Hype Meter */}
        <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Velocidad de Chat (Kick & Twitch)</span>
            </span>
            <span className={`font-mono font-bold text-xs ${
              chatVelocity >= settings.chatVelocityThreshold ? 'text-purple-400 animate-pulse' : 'text-neutral-400'
            }`}>
              {chatVelocity} msgs/min
            </span>
          </div>

          {/* Velocity Bar */}
          <div className="space-y-1">
            <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden relative border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-200 rounded-full"
                style={{ width: `${Math.min(100, (chatVelocity / 30) * 100)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                style={{ left: `${Math.min(95, (settings.chatVelocityThreshold / 30) * 100)}%` }}
                title={`Umbral: ${settings.chatVelocityThreshold} msgs/min`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-0.5">
              <span>Tranquilo</span>
              <span className="text-purple-400 font-semibold">Hype ({settings.chatVelocityThreshold} msgs)</span>
              <span>¡Spam!</span>
            </div>
          </div>
        </div>

        {/* Gauge 3: Combined Hype Index & Instant Simulator */}
        <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Índice de Hype Global</span>
            </span>
            <span className="font-mono font-bold text-amber-400">{hypeIndex}%</span>
          </div>

          <div className="text-[11px] text-neutral-500 mt-2">
            Sin simulación: habla por tu micrófono real o usa “Marcar Clip Ahora”.
          </div>
        </div>

      </div>

      {/* Expandable Settings Drawer */}
      {showSettings && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configuración del Detector & Automatización OBS</span>
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Audio Threshold */}
            <div>
              <label className="block text-neutral-400 mb-1">
                Umbral de Decibeles (Audio Spike): <span className="text-white font-mono">{settings.audioThresholdDb} dB</span>
              </label>
              <input
                type="range"
                min="-16"
                max="-1"
                step="0.5"
                value={settings.audioThresholdDb}
                onChange={(e) => setSettings(s => ({ ...s, audioThresholdDb: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500">Valores típicos: -6 dB a -3 dB para gritos</span>
            </div>

            {/* Chat Velocity Threshold */}
            <div>
              <label className="block text-neutral-400 mb-1">
                Umbral de Chat (Msgs/min): <span className="text-white font-mono">{settings.chatVelocityThreshold} msgs</span>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={settings.chatVelocityThreshold}
                onChange={(e) => setSettings(s => ({ ...s, chatVelocityThreshold: parseInt(e.target.value, 10) }))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500">Dispara cuando sube la velocidad de chat</span>
            </div>

            {/* Clip Duration */}
            <div>
              <label className="block text-neutral-400 mb-1">
                Duración del Buffer de Clip: <span className="text-white font-mono">{settings.clipDurationSeconds} seg</span>
              </label>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={settings.clipDurationSeconds}
                onChange={(e) => setSettings(s => ({ ...s, clipDurationSeconds: parseInt(e.target.value, 10) }))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500">Guarda 20s previos y 10s posteriores</span>
            </div>

            {/* Auto OBS Replay Buffer */}
            <div className="flex flex-col justify-center space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoTriggerReplayBuffer}
                  onChange={(e) => setSettings(s => ({ ...s, autoTriggerReplayBuffer: e.target.checked }))}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <span className="text-neutral-300 font-medium">Auto-guardar Replay Buffer en OBS</span>
              </label>
              <span className="text-[10px] text-neutral-500">Envía señal SaveReplayBuffer a OBS Studio</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-300">Filtrar Momentos:</span>
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded transition-colors ${filterType === 'all' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              Todos ({highlights.length})
            </button>
            <button
              onClick={() => setFilterType('audio')}
              className={`px-2.5 py-1 rounded transition-colors ${filterType === 'audio' ? 'bg-neutral-800 text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              🎤 Picos de Audio
            </button>
            <button
              onClick={() => setFilterType('chat')}
              className={`px-2.5 py-1 rounded transition-colors ${filterType === 'chat' ? 'bg-neutral-800 text-purple-400 font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              💬 Hype de Chat
            </button>
            <button
              onClick={() => setFilterType('manual')}
              className={`px-2.5 py-1 rounded transition-colors ${filterType === 'manual' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-400 hover:text-white'}`}
            >
              ⚡ Manuales
            </button>
          </div>
        </div>

        <span className="text-xs font-mono text-neutral-400">
          {filteredHighlights.length} segmentos listos para exportar a Kick / Twitch / Shorts
        </span>
      </div>

      {/* Highlights Cards List */}
      {filteredHighlights.length === 0 ? (
        <div className="bg-neutral-950/40 border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-400 space-y-2">
          <Flame className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-xs">No hay momentos detectados en esta categoría aún.</p>
          <p className="text-[11px] text-neutral-500">Sin momentos aún. Usa "Marcar Clip Ahora" durante un momento real.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHighlights.map((hl) => (
            <div
              key={hl.id}
              className="bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 rounded-xl overflow-hidden transition-all shadow-md group flex flex-col justify-between"
            >
              {/* Card Top: Thumbnail Preview & Overlay Badges */}
              <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
                <img
                  src={hl.thumbnailUrl}
                  alt={hl.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                {/* Top badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] flex items-center gap-1 backdrop-blur-md ${
                    hl.triggerType === 'audio_spike'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : hl.triggerType === 'chat_velocity'
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  }`}>
                    {hl.triggerType === 'audio_spike' && <Volume2 className="w-3 h-3" />}
                    {hl.triggerType === 'chat_velocity' && <MessageSquare className="w-3 h-3" />}
                    {hl.triggerType === 'manual_marker' && <Zap className="w-3 h-3" />}
                    <span>{hl.triggerType === 'audio_spike' ? 'Audio Spike' : hl.triggerType === 'chat_velocity' ? 'Chat Hype' : 'Marcador Manual'}</span>
                  </span>

                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/70 text-white font-bold backdrop-blur-md">
                    {hl.durationSeconds}s · {hl.streamTimestamp}
                  </span>
                </div>

                {/* Bottom on thumbnail: Reason and intensity */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 font-mono mb-1">
                    <span className="truncate pr-2">{hl.triggerDetail}</span>
                    <span className="text-amber-400 font-bold shrink-0">{hl.intensity}% Intensidad</span>
                  </div>
                  {hl.obsReplaySaved && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>OBS Replay Buffer Guardado en Disco</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: Title & Meta */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {hl.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                      {hl.gameCategory}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                      {hl.sceneName}
                    </span>
                  </div>

                  {hl.chatSnippet && hl.chatSnippet.length > 0 && (
                    <div className="mt-2.5 bg-neutral-950 border border-neutral-800/80 rounded p-2 text-[10px] text-neutral-400 space-y-0.5">
                      <span className="text-neutral-500 font-bold block text-[9px] uppercase tracking-wider">Reacciones de chat capturadas:</span>
                      <p className="italic text-neutral-300 truncate font-mono">
                        "{hl.chatSnippet.join(' · ')}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* AI Titles Button */}
                    <button
                      onClick={() => handleRequestAiInfo(hl)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-900/60 to-purple-800/60 hover:from-purple-800 hover:to-purple-700 text-purple-200 border border-purple-700/60 rounded text-xs font-semibold transition-colors"
                      title="Generar títulos virales para TikTok y Shorts con Gemini"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Títulos IA</span>
                    </button>

                    {/* Send to Thumbnail Studio */}
                    {onSendToThumbnail && (
                      <button
                        onClick={() => onSendToThumbnail(hl.title, hl.thumbnailUrl)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-900/40 rounded text-xs font-semibold transition-colors"
                        title="Abrir en el editor de miniaturas para crear portada"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Miniatura</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Copy Clip Metadata */}
                    <button
                      onClick={() => handleExportClipInfo(hl)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      title="Copiar metadatos del clip"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Download JSON / EDL */}
                    <button
                      onClick={() => handleDownloadEdlJson(hl)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      title="Descargar marcador JSON / EDL para Premiere/DaVinci"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteHighlight(hl.id)}
                      className="p-1.5 rounded hover:bg-red-950 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Eliminar highlight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Suggestions Modal (Gemini Powered) */}
      {selectedHighlightForAI && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Optimización Viral IA con Gemini</h3>
                  <p className="text-[11px] text-neutral-400">Títulos de alto CTR y hashtags listos para TikTok, Shorts y Kick</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHighlightForAI(null)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {isAiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                <p className="text-xs text-neutral-400 font-mono">Gemini está analizando la intensidad del momento...</p>
              </div>
            ) : aiSuggestions ? (
              <div className="space-y-4">
                
                {/* 3 Viral Titles */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-2">
                    Selecciona un Título Viral Sugerido:
                  </label>
                  <div className="space-y-2">
                    {aiSuggestions.titles.map((title, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-purple-500/60 transition-colors group cursor-pointer"
                        onClick={() => handleApplyTitle(title)}
                      >
                        <span className="text-xs font-bold text-white pr-2 group-hover:text-purple-300">
                          {title}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-semibold text-purple-400 hover:text-purple-300 underline"
                        >
                          Usar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description & Hashtags */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Descripción Optimizada para Redes:
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                    {aiSuggestions.summary}
                  </p>

                  <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap gap-1.5">
                    {aiSuggestions.tiktokHashtags.map((tag, i) => (
                      <span key={i} className="text-[11px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Thumbnail Idea */}
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 text-xs">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    💡 Idea para Miniatura del Clip:
                  </span>
                  <p className="text-neutral-300 italic">{aiSuggestions.thumbnailIdea}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedHighlightForAI(null)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Listo
                  </button>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
};
