import React, { useState } from 'react';
import {
  Video, Eye, EyeOff, Lock, Unlock, Volume2, VolumeX,
  Play, Square, Pause, Camera, Repeat, Sliders, Zap, CheckCircle2,
  Tv, Server, RefreshCw, Layers
} from 'lucide-react';
import { OBSState, TransitionType } from '../types/stream';
import { obsController } from '../services/obsController';
import { StreamTelemetryCharts } from './StreamTelemetryCharts';
import { ScenePresetsManager } from './ScenePresetsManager';
import { HighlightDetectorManager } from './HighlightDetectorManager';
import { UnifiedChatMessage } from '../types/stream';

interface OBSCommanderProps {
  obsState: OBSState;
  chatMessages?: UnifiedChatMessage[];
  gameCategory?: string;
  onSendToThumbnail?: (title: string, backgroundUrl: string) => void;
  onShowToast?: (message: string) => void;
}

const TRANSITIONS: TransitionType[] = ['Cut', 'Fade', 'Stinger Neon', 'Slide Left', 'Luma Wipe'];

export const OBSCommander: React.FC<OBSCommanderProps> = ({
  obsState,
  chatMessages = [],
  gameCategory = 'Gaming',
  onSendToThumbnail,
  onShowToast = () => {},
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [hostInput, setHostInput] = useState(obsState.host);
  const [portInput, setPortInput] = useState(obsState.port.toString());
  const [passwordInput, setPasswordInput] = useState(obsState.password || '');
  const [isConnecting, setIsConnecting] = useState(false);

  const activeScene = obsState.scenes.find(s => s.id === obsState.activeSceneId) || obsState.scenes[0];

  const handleSceneClick = (sceneId: string) => {
    obsController.switchScene(sceneId);
  };

  const handleTransitionChange = (t: TransitionType) => {
    obsController.setTransition(t);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    obsController.setTransition(obsState.currentTransition, parseInt(e.target.value, 10));
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    await obsController.connect(hostInput, parseInt(portInput, 10) || 4455, passwordInput);
    setIsConnecting(false);
    setShowConnectModal(false);
  };

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: OBS Connection & Broadcast Quick Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold text-neutral-200">
              OBS Studio WebSocket v5 Activo
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              ({obsState.host}:{obsState.port})
            </span>
          </div>

          <button
            onClick={() => setShowConnectModal(true)}
            className="text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded transition-colors flex items-center gap-1.5"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Configurar Conexión OBS</span>
          </button>
        </div>

        {/* Live Broadcast Telemetry Strip */}
        <div className="flex items-center gap-4 text-xs font-mono text-neutral-300">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">FPS:</span>
            <span className="text-emerald-400 font-bold tabular-nums">{obsState.stats.fps.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">BITRATE:</span>
            <span className="text-emerald-400 font-bold tabular-nums">{obsState.stats.bitrate} kb/s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">DROPS:</span>
            <span className="text-neutral-200 tabular-nums">0 (0.0%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">CPU:</span>
            <span className="text-neutral-200 tabular-nums">{obsState.stats.cpu}%</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-4">
            <span className="text-neutral-400">UPTIME:</span>
            <span className="text-purple-400 font-bold tabular-nums">{formatTime(obsState.stats.uptimeSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Deck Grid: Program Viewport + Audio Mixer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Program Viewport & Transitions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Virtual Program Screen */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold tracking-wider text-red-400 uppercase">OBS PROGRAM MONITOR</span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-300 font-medium">{activeScene.name}</span>
              </div>
              <span className="font-mono text-neutral-400">1920x1080 @ 60fps</span>
            </div>

            {/* Simulated Live Broadcast Display */}
            <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden group select-none">
              
              {/* Scene Visual Representation */}
              {obsState.activeSceneId === 'scene_starting' && (
                <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-neutral-950 to-purple-950 flex flex-col items-center justify-center p-8 text-center relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0,transparent_70%)]" />
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">Transmisión Iniciando</span>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4 font-display">EMPEZAMOS EN BREVE</h2>
                  <div className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-400 tabular-nums">
                    03:45
                  </div>
                  <div className="mt-6 flex items-center gap-4 text-xs font-mono text-neutral-300 bg-black/40 px-4 py-2 rounded-lg border border-neutral-800">
                    <span>twitch.tv/mystream</span>
                    <span>·</span>
                    <span>kick.com/mystream</span>
                  </div>
                </div>
              )}

              {obsState.activeSceneId === 'scene_chatting' && (
                <div className="w-full h-full relative overflow-hidden bg-neutral-950">
                  <img
                    src="/src/assets/images/thumbnail_irl_reaction_1791998919984.jpg"
                    alt="Main Webcam Stream View"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay elements */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
                  
                  {activeScene.sources.find(s => s.id === 'src_chatbox')?.visible && (
                    <div className="absolute bottom-6 left-6 w-72 bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 rounded-lg p-3 text-xs space-y-2 pointer-events-none shadow-xl">
                      <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[10px] pb-1 border-b border-neutral-800">
                        <Tv className="w-3 h-3 text-purple-400" />
                        <span>Chat en Pantalla</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px]"><span className="text-emerald-400 font-bold">@Alex_Gaming:</span> que buen setup bro! 🔥</div>
                        <div className="text-[11px]"><span className="text-purple-400 font-bold">@SofiStream:</span> vamos por ese top 1 hoy!!</div>
                      </div>
                    </div>
                  )}

                  {activeScene.sources.find(s => s.id === 'src_cam_frame')?.visible && (
                    <div className="absolute inset-4 border-2 border-purple-500/50 rounded-lg pointer-events-none shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
                  )}

                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-neutral-800 flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-medium text-white">Cámara Sony A6400 (4K)</span>
                  </div>
                </div>
              )}

              {obsState.activeSceneId === 'scene_gameplay' && (
                <div className="w-full h-full relative overflow-hidden bg-neutral-950">
                  <img
                    src="/src/assets/images/thumbnail_gaming_action_1791998919003.jpg"
                    alt="Gameplay Capture View"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* PiP Camera in Corner */}
                  {activeScene.sources.find(s => s.id === 'src_cam_corner')?.visible && (
                    <div className="absolute bottom-4 right-4 w-52 aspect-video rounded-lg overflow-hidden border-2 border-emerald-400/80 shadow-2xl">
                      <img
                        src="/src/assets/images/streamer_avatar_creator_1791998920448.jpg"
                        alt="Facecam Streamer"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/70 text-[9px] font-mono px-1.5 py-0.5 rounded text-emerald-300">
                        MIC ACTIVE
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-neutral-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-neutral-300 border border-neutral-800">
                    DirectX 12 Game Capture: 144 FPS
                  </div>
                </div>
              )}

              {obsState.activeSceneId === 'scene_brb' && (
                <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center text-center p-8 relative">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
                    <Pause className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 font-display">YA VOLVEMOS</h2>
                  <p className="text-neutral-400 text-sm max-w-sm">Pausa rápida de 2 minutos para hidratarse. ¡Quédate en el chat!</p>
                </div>
              )}

              {obsState.activeSceneId === 'scene_ending' && (
                <div className="w-full h-full bg-gradient-to-t from-purple-950 via-neutral-950 to-neutral-950 flex flex-col items-center justify-center text-center p-8 relative">
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">¡Gracias por Acompañarnos!</span>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4 font-display">FIN DE LA TRANSMISIÓN</h2>
                  <div className="flex items-center gap-3 text-xs bg-black/60 px-4 py-2 rounded-lg border border-neutral-800">
                    <span>Próximo Stream: Mañana 19:00 hs</span>
                    <span>·</span>
                    <span className="text-emerald-400 font-bold">Preparando Raid...</span>
                  </div>
                </div>
              )}

              {/* Animated Transition Flash Overlay */}
              {obsState.isTransitioning && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-emerald-400/90 to-purple-600/90 flex items-center justify-center z-40 animate-pulse">
                  <div className="text-neutral-950 font-black text-xl tracking-widest uppercase flex items-center gap-2">
                    <Zap className="w-6 h-6 fill-current" />
                    <span>{obsState.currentTransition} TRANSITION</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick OBS Action Toolbar */}
            <div className="bg-neutral-950 px-4 py-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => obsController.toggleRecording()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    obsState.recording
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{obsState.recording ? 'Grabando...' : 'Iniciar Grabación'}</span>
                </button>

                {obsState.recording && (
                  <button
                    onClick={() => obsController.togglePauseRecording()}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
                    title={obsState.recordingPaused ? 'Reanudar' : 'Pausar'}
                  >
                    {obsState.recordingPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  onClick={() => obsController.toggleVirtualCam()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    obsState.virtualCam
                      ? 'bg-purple-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cámara Virtual</span>
                </button>

                <button
                  onClick={() => obsController.toggleReplayBuffer()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    obsState.replayBuffer
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Buffer de Repetición</span>
                </button>
              </div>

              {/* Instant Stinger Action */}
              <button
                onClick={() => obsController.switchScene(obsState.activeSceneId)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-purple-300 rounded-lg transition-colors border border-purple-800/40"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Disparar {obsState.currentTransition}</span>
              </button>
            </div>
          </div>

          {/* Scene Presets & Layout Profiles Manager */}
          <ScenePresetsManager
            onPresetApplied={(_name) => {}}
          />

          {/* Scene Switcher & Transition Controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Selector de Escenas OBS Studio</span>
                </h3>
                <p className="text-xs text-neutral-400">Haz clic en cualquier escena para cambiar en vivo con transición inmediata</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400">Efecto:</span>
                <select
                  value={obsState.currentTransition}
                  onChange={(e) => handleTransitionChange(e.target.value as TransitionType)}
                  className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-500"
                >
                  {TRANSITIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={obsState.transitionDurationMs}
                  onChange={handleDurationChange}
                  className="w-20 accent-purple-500 cursor-pointer"
                  title={`Duración: ${obsState.transitionDurationMs}ms`}
                />
                <span className="font-mono text-neutral-400 text-[11px] w-12">{obsState.transitionDurationMs}ms</span>
              </div>
            </div>

            {/* Scene Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {obsState.scenes.map((scene) => {
                const isActive = scene.id === obsState.activeSceneId;
                return (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneClick(scene.id)}
                    className={`relative p-3 rounded-lg border text-left transition-all group ${
                      isActive
                        ? 'bg-neutral-800/90 border-emerald-400 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}>
                        {isActive ? '● EN VIVO' : 'DISPONIBLE'}
                      </span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                      {scene.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1">
                      {scene.sources.length} fuentes configuradas
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sources Visibility Inspector for Active Scene */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Fuentes de Video & Overlays: {activeScene.name}</span>
                </h3>
                <p className="text-xs text-neutral-400">Oculta o muestra cámaras, capas de juego y widgets en tiempo real</p>
              </div>
              <span className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                {activeScene.sources.filter(s => s.visible).length} / {activeScene.sources.length} Visibles
              </span>
            </div>

            <div className="divide-y divide-neutral-800/60 border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950/40">
              {activeScene.sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-neutral-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => obsController.toggleSourceVisibility(activeScene.id, source.id)}
                      className={`p-1.5 rounded transition-colors ${
                        source.visible
                          ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40'
                          : 'text-neutral-500 hover:text-neutral-300 bg-neutral-800'
                      }`}
                      title={source.visible ? 'Ocultar fuente' : 'Mostrar fuente'}
                    >
                      {source.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <div className="truncate">
                      <div className={`text-xs font-medium truncate ${source.visible ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>
                        {source.name}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase">{source.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => obsController.toggleSourceLock(activeScene.id, source.id)}
                      className={`p-1.5 rounded text-xs ${source.locked ? 'text-neutral-400' : 'text-neutral-600 hover:text-neutral-400'}`}
                      title={source.locked ? 'Fuente bloqueada' : 'Fuente desbloqueada'}
                    >
                      {source.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Audio Mixer Console (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Mezclador de Audio OBS</span>
                </h3>
                <p className="text-xs text-neutral-400">Control de volumen, vúmetros y silenciado</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded">
                48 kHz · 24-bit
              </span>
            </div>

            {/* Audio Channels List */}
            <div className="space-y-4">
              {obsState.audioChannels.map((channel) => (
                <div key={channel.id} className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-neutral-200 truncate">{channel.name}</div>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">{channel.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tabular-nums text-neutral-300 w-14 text-right">
                        {channel.muted ? 'MUTED' : `${channel.volumeDb} dB`}
                      </span>
                      <button
                        onClick={() => obsController.toggleAudioMute(channel.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          channel.muted
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                        title={channel.muted ? 'Reactivar audio' : 'Silenciar canal'}
                      >
                        {channel.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={channel.volume}
                      disabled={channel.muted}
                      onChange={(e) => obsController.setAudioVolume(channel.id, parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer disabled:opacity-30"
                    />

                    {/* Realistic Animated VU Peak Meter */}
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden flex items-center p-0.5 border border-neutral-800">
                      <div
                        className={`h-full rounded-full transition-all duration-100 ${
                          channel.muted
                            ? 'w-0'
                            : channel.peak > 0.85
                            ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500'
                            : channel.peak > 0.6
                            ? 'bg-gradient-to-r from-emerald-500 to-yellow-400'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${channel.muted ? 0 : Math.round(channel.peak * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Mixer Reset */}
            <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800/80">
              <span>Limiter OBS Activo (-0.5 dB)</span>
              <button
                onClick={() => {
                  obsState.audioChannels.forEach(ch => {
                    if (ch.muted) obsController.toggleAudioMute(ch.id);
                  });
                }}
                className="text-neutral-300 hover:text-white underline text-xs"
              >
                Reactivar Todo
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Automatic High-Activity Detector & Highlight Segments Engine */}
      <HighlightDetectorManager
        obsState={obsState}
        chatMessages={chatMessages}
        gameCategory={gameCategory}
        onSendToThumbnail={onSendToThumbnail}
        onShowToast={onShowToast}
      />

      {/* Real-time Telemetry & Performance Charts (60 Minutes History) */}
      <StreamTelemetryCharts
        currentStats={obsState.stats}
        isStreaming={obsState.streaming}
      />

      {/* OBS WebSocket Setup Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Conexión OBS WebSocket v5</h3>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              En OBS Studio ve a <strong className="text-neutral-200">Herramientas &gt; Configuración del servidor WebSocket</strong>. Habilita el servidor (puerto por defecto 4455). Si no está abierto, el software continuará en modo simulador interactivo para que pruebes todas las funciones.
            </p>

            <form onSubmit={handleConnectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Host / IP</label>
                <input
                  type="text"
                  value={hostInput}
                  onChange={(e) => setHostInput(e.target.value)}
                  placeholder="localhost o 127.0.0.1"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Puerto WebSocket</label>
                <input
                  type="number"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  placeholder="4455"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Contraseña (opcional)</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Dejar vacío si no configuraste contraseña"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
                >
                  {isConnecting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isConnecting ? 'Conectando...' : 'Conectar a OBS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
