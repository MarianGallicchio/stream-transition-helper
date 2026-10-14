import React, { useState } from 'react';
import {
  Zap, VolumeX, AlertTriangle, MessageSquare, Video,
  Flame, Award, RotateCcw, Check, Sparkles, Radio
} from 'lucide-react';
import { obsController } from '../services/obsController';

interface StreamDeckMacrosProps {
  onTriggerAction: (actionName: string) => void;
}

export const StreamDeckMacros: React.FC<StreamDeckMacrosProps> = ({ onTriggerAction }) => {
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  const executeMacro = (id: string, name: string, action: () => void) => {
    setActiveButton(id);
    action();
    onTriggerAction(name);
    setLastExecuted(name);
    setTimeout(() => setActiveButton(null), 300);
    setTimeout(() => setLastExecuted(null), 3000);
  };

  const macros = [
    {
      id: 'macro_stinger_cam',
      name: 'Stinger & Charla',
      subtitle: 'Pasa a Just Chatting con Stinger',
      icon: Zap,
      color: 'from-purple-600 to-indigo-600',
      action: () => {
        obsController.setTransition('Stinger Neon');
        obsController.switchScene('scene_chatting');
      }
    },
    {
      id: 'macro_gameplay',
      name: 'Entrar a Juego',
      subtitle: 'Pasa a escena Gameplay 60FPS',
      icon: Video,
      color: 'from-emerald-500 to-teal-600',
      action: () => {
        obsController.setTransition('Fade');
        obsController.switchScene('scene_gameplay');
      }
    },
    {
      id: 'macro_emergency_mute',
      name: 'Silencio Total (Panic)',
      subtitle: 'Mutea Micrófono y Discord',
      icon: VolumeX,
      color: 'from-red-600 to-rose-700',
      action: () => {
        obsController.toggleAudioMute('audio_mic');
        obsController.toggleAudioMute('audio_discord');
      }
    },
    {
      id: 'macro_brb_pause',
      name: 'Pausa Rápida (BRB)',
      subtitle: 'Escena Ya Vuelvo y Música',
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      action: () => {
        obsController.switchScene('scene_brb');
      }
    },
    {
      id: 'macro_clip',
      name: 'Guardar Clip / Replay',
      subtitle: 'Guarda últimos 60 seg en disco',
      icon: Flame,
      color: 'from-pink-600 to-rose-500',
      action: () => {
        obsController.saveReplayBuffer();
      }
    },
    {
      id: 'macro_ending_raid',
      name: 'Escena de Despedida',
      subtitle: 'Créditos finales y raid',
      icon: Award,
      color: 'from-blue-600 to-cyan-600',
      action: () => {
        obsController.switchScene('scene_ending');
      }
    },
    {
      id: 'macro_toggle_cam',
      name: 'Ocultar / Mostrar Facecam',
      subtitle: 'Alterna visibilidad de webcam',
      icon: Sparkles,
      color: 'from-purple-500 to-emerald-500',
      action: () => {
        const state = obsController.getState();
        obsController.toggleSourceVisibility(state.activeSceneId, 'src_cam_main');
        obsController.toggleSourceVisibility(state.activeSceneId, 'src_cam_corner');
      }
    },
    {
      id: 'macro_reset_audio',
      name: 'Reactivar Todos los Audios',
      subtitle: 'Desmutea y restaura niveles',
      icon: RotateCcw,
      color: 'from-neutral-700 to-neutral-800',
      action: () => {
        const state = obsController.getState();
        state.audioChannels.forEach(ch => {
          if (ch.muted) obsController.toggleAudioMute(ch.id);
        });
      }
    },
    {
      id: 'macro_test_drops',
      name: 'Verificar Alerta de Red',
      subtitle: 'Comprueba el sistema de alerta en footer y toast',
      icon: AlertTriangle,
      color: 'from-amber-600 to-red-600',
      action: () => {
        obsController.simulateHighFrameDrops(6.5);
      }
    },
    {
      id: 'macro_test_restore',
      name: 'Recalibrar Red Nominal',
      subtitle: 'Restaura bitrate 6800 kb/s y 0% de pérdidas',
      icon: Zap,
      color: 'from-emerald-500 to-emerald-700',
      action: () => {
        obsController.restoreNominalNetwork();
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>Virtual Stream Deck: Macros y Atajos Instantáneos</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Botones de acción rápida con respuesta en menos de 100ms para controlar OBS y la transmisión sin salir del juego
          </p>
        </div>

        {lastExecuted && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold animate-pulse">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Ejecutado: {lastExecuted}</span>
          </div>
        )}
      </div>

      {/* Stream Deck Grid (2 rows x 4 cols on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {macros.map((macro) => {
          const Icon = macro.icon;
          const isPressed = activeButton === macro.id;

          return (
            <button
              key={macro.id}
              onClick={() => executeMacro(macro.id, macro.name, macro.action)}
              className={`p-5 rounded-xl border border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-left transition-all duration-150 relative overflow-hidden group select-none shadow-lg ${
                isPressed ? 'scale-95 ring-2 ring-emerald-400 shadow-emerald-500/20' : 'hover:-translate-y-0.5'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${macro.color} p-0.5 flex items-center justify-center mb-3 shadow-md`}>
                <div className="w-full h-full bg-neutral-950/40 rounded-[10px] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                </div>
              </div>

              <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                {macro.name}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1 leading-snug line-clamp-2">
                {macro.subtitle}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-2 border-t border-neutral-900">
                <span>MACRO 1-TOUCH</span>
                <span className="text-emerald-400 group-hover:inline hidden">DISPARAR →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
