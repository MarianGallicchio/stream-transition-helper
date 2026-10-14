import React, { useState, useEffect } from 'react';
import {
  Bookmark, Plus, Check, Trash2, RotateCcw,
  Sliders, MessageSquare, Gamepad2, Coffee, Sparkles, Trophy
} from 'lucide-react';
import { ScenePreset, TransitionType } from '../types/stream';
import { obsController } from '../services/obsController';

interface ScenePresetsManagerProps {
  onPresetApplied: (presetName: string) => void;
}

const DEFAULT_PRESETS: ScenePreset[] = [
  {
    id: 'preset_just_chatting',
    name: 'Charla Principal (Just Chatting)',
    description: 'Cámara 4K en plano principal, chat unificado interactivo, alertas de suscripción y música suave.',
    icon: 'chat',
    sceneId: 'scene_chatting',
    transition: 'Stinger Neon',
    transitionDurationMs: 400,
    sourcesConfig: {
      src_cam_main: true,
      src_cam_frame: true,
      src_chatbox: true,
      src_alerts: true,
      src_sponsor: false,
    },
    audioVolumes: {
      audio_mic: 0.90,
      audio_desktop: 0.50,
      audio_music: 0.35,
      audio_discord: 0.70,
      audio_alerts: 0.85,
    },
    audioMutes: {
      audio_mic: false,
      audio_desktop: false,
      audio_music: false,
      audio_discord: false,
      audio_alerts: false,
    },
    isDefault: true,
  },
  {
    id: 'preset_gameplay_pro',
    name: 'Gaming Competitivo (Full Gameplay)',
    description: 'Captura directa de juego 60FPS a pantalla completa, facecam en esquina inferior, audio de juego prioritario.',
    icon: 'game',
    sceneId: 'scene_gameplay',
    transition: 'Fade',
    transitionDurationMs: 250,
    sourcesConfig: {
      src_game_capture: true,
      src_cam_corner: true,
      src_chat_transparent: true,
      src_recent_event: true,
    },
    audioVolumes: {
      audio_mic: 0.85,
      audio_desktop: 0.80,
      audio_music: 0.20,
      audio_discord: 0.75,
      audio_alerts: 0.75,
    },
    audioMutes: {
      audio_mic: false,
      audio_desktop: false,
      audio_music: false,
      audio_discord: false,
      audio_alerts: false,
    },
    isDefault: true,
  },
  {
    id: 'preset_brb_break',
    name: 'Pausa Rápida (BRB / Ya Vuelvo)',
    description: 'Mutea automáticamente el micrófono del streamer y Discord, sube la música ambiental y muestra contador de regreso.',
    icon: 'pause',
    sceneId: 'scene_brb',
    transition: 'Cut',
    transitionDurationMs: 150,
    sourcesConfig: {
      src_brb_bg: true,
      src_brb_text: true,
      src_brb_clip: true,
    },
    audioVolumes: {
      audio_mic: 0.0,
      audio_desktop: 0.20,
      audio_music: 0.55,
      audio_discord: 0.0,
      audio_alerts: 0.50,
    },
    audioMutes: {
      audio_mic: true,
      audio_desktop: false,
      audio_music: false,
      audio_discord: true,
      audio_alerts: false,
    },
    isDefault: true,
  },
  {
    id: 'preset_starting_soon',
    name: 'Inicio de Emisión (Starting Soon)',
    description: 'Pantalla de bienvenida con contador 5:00, redes sociales y música sin voz para ambientar antes de empezar.',
    icon: 'start',
    sceneId: 'scene_starting',
    transition: 'Fade',
    transitionDurationMs: 500,
    sourcesConfig: {
      src_bg_countdown: true,
      src_timer: true,
      src_music_overlay: true,
      src_socials: true,
    },
    audioVolumes: {
      audio_mic: 0.0,
      audio_desktop: 0.10,
      audio_music: 0.65,
      audio_discord: 0.0,
      audio_alerts: 0.0,
    },
    audioMutes: {
      audio_mic: true,
      audio_desktop: true,
      audio_music: false,
      audio_discord: true,
      audio_alerts: true,
    },
    isDefault: true,
  },
  {
    id: 'preset_ending_raid',
    name: 'Despedida & Raid de Comunidad',
    description: 'Créditos del directo, agradecimiento a donadores y preparación para enviar la raid a otro streamer de Kick o Twitch.',
    icon: 'trophy',
    sceneId: 'scene_ending',
    transition: 'Luma Wipe',
    transitionDurationMs: 600,
    sourcesConfig: {
      src_ending_bg: true,
      src_raid_target: true,
      src_top_supporters: true,
    },
    audioVolumes: {
      audio_mic: 0.85,
      audio_desktop: 0.20,
      audio_music: 0.50,
      audio_discord: 0.0,
      audio_alerts: 0.60,
    },
    audioMutes: {
      audio_mic: false,
      audio_desktop: false,
      audio_music: false,
      audio_discord: true,
      audio_alerts: false,
    },
    isDefault: true,
  }
];

export const ScenePresetsManager: React.FC<ScenePresetsManagerProps> = ({ onPresetApplied }) => {
  const [presets, setPresets] = useState<ScenePreset[]>(() => {
    try {
      const saved = localStorage.getItem('streamhub_scene_presets');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_PRESETS;
  });

  const [activePresetId, setActivePresetId] = useState<string>('preset_just_chatting');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Save custom presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('streamhub_scene_presets', JSON.stringify(presets));
    } catch (e) {
      console.warn('Could not save presets to localStorage', e);
    }
  }, [presets]);

  // Apply a preset with 1-click
  const handleApplyPreset = (preset: ScenePreset) => {
    // 1. Switch Scene
    obsController.setTransition(preset.transition, preset.transitionDurationMs);
    obsController.switchScene(preset.sceneId);

    // 2. Configure Sources
    const currentState = obsController.getState();
    const currentScene = currentState.scenes.find(s => s.id === preset.sceneId);
    if (currentScene && preset.sourcesConfig) {
      currentScene.sources.forEach(src => {
        const targetVisible = preset.sourcesConfig[src.id];
        if (targetVisible !== undefined && targetVisible !== src.visible) {
          obsController.toggleSourceVisibility(preset.sceneId, src.id);
        }
      });
    }

    // 3. Configure Audio Levels and Mutes
    if (preset.audioVolumes) {
      Object.entries(preset.audioVolumes).forEach(([chId, vol]) => {
        obsController.setAudioVolume(chId, vol);
      });
    }

    if (preset.audioMutes) {
      Object.entries(preset.audioMutes).forEach(([chId, mute]) => {
        const ch = currentState.audioChannels.find(c => c.id === chId);
        if (ch && ch.muted !== mute) {
          obsController.toggleAudioMute(chId);
        }
      });
    }

    setActivePresetId(preset.id);
    onPresetApplied(preset.name);
    setFeedbackNotice(`¡Perfil "${preset.name}" aplicado con éxito!`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // Save Current OBS Layout as a New Custom Profile
  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const state = obsController.getState();
    const activeScene = state.scenes.find(s => s.id === state.activeSceneId);

    const sourcesConfig: { [key: string]: boolean } = {};
    if (activeScene) {
      activeScene.sources.forEach(s => {
        sourcesConfig[s.id] = s.visible;
      });
    }

    const audioVolumes: { [key: string]: number } = {};
    const audioMutes: { [key: string]: boolean } = {};
    state.audioChannels.forEach(ch => {
      audioVolumes[ch.id] = ch.volume;
      audioMutes[ch.id] = ch.muted;
    });

    const newPreset: ScenePreset = {
      id: `preset_custom_${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || `Configuración personalizada guardada en la escena ${activeScene?.name || ''}`,
      icon: 'custom',
      sceneId: state.activeSceneId,
      transition: state.currentTransition,
      transitionDurationMs: state.transitionDurationMs,
      sourcesConfig,
      audioVolumes,
      audioMutes,
      isDefault: false
    };

    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    setShowNewModal(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setFeedbackNotice(`¡Nuevo perfil "${newPreset.name}" guardado!`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) {
      setActivePresetId(presets[0]?.id || '');
    }
  };

  const handleResetDefaults = () => {
    setPresets(DEFAULT_PRESETS);
    setFeedbackNotice('Perfiles restaurados a valores de fábrica.');
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const getPresetIcon = (icon: ScenePreset['icon']) => {
    switch (icon) {
      case 'chat': return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'game': return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      case 'pause': return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'start': return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'trophy': return <Trophy className="w-4 h-4 text-yellow-400" />;
      default: return <Sliders className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span>Gestor de Perfiles de Escena (Scene Presets & Layouts)</span>
          </h3>
          <p className="text-xs text-neutral-400">
            Alterna al instante entre configuraciones completas de transmisión (escenas, fuentes, volumen y transiciones) con 1 solo clic
          </p>
        </div>

        <div className="flex items-center gap-2">
          {feedbackNotice && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in mr-2">
              <Check className="w-3.5 h-3.5" />
              <span>{feedbackNotice}</span>
            </span>
          )}

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Guardar Perfil Actual</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 transition-colors"
            title="Restaurar perfiles de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;

          return (
            <div
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                isActive
                  ? 'bg-neutral-800/90 border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-950/30'
                  : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    {getPresetIcon(preset.icon)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                        ● ACTIVO
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        Aplicar →
                      </span>
                    )}

                    {!preset.isDefault && (
                      <button
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar perfil personalizado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                  {preset.name}
                </div>

                <div className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                  {preset.description}
                </div>
              </div>

              {/* Preset Meta Footer */}
              <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span className="truncate">{preset.transition} ({preset.transitionDurationMs}ms)</span>
                <span className="text-neutral-400">1-Click</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Save Current State as New Preset */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Guardar Perfil de Escena Actual</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Esto capturará la escena activa, la visibilidad de todas las fuentes de video, la transición configurada y los volúmenes del mezclador de audio para que puedas restaurarlos cuando quieras.
            </p>

            <form onSubmit={handleSaveCurrentAsPreset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nombre del Perfil</label>
                <input
                  type="text"
                  required
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Ej: Modo Carrera F1, Charla Chill con Invitado..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  placeholder="Detalles sobre qué cámaras y audios están configurados"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
