import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, WifiOff, X, ArrowRight, RotateCcw, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { OBSStats, StreamAlert } from '../types/stream';
import { obsController } from '../services/obsController';

interface BroadcastAlertSystemProps {
  stats: OBSStats;
  isStreaming: boolean;
  onNavigateToTelemetry: () => void;
  onAlertChange: (alert: StreamAlert | null) => void;
}

export const BroadcastAlertSystem: React.FC<BroadcastAlertSystemProps> = ({
  stats,
  isStreaming,
  onNavigateToTelemetry,
  onAlertChange
}) => {
  const [activeAlert, setActiveAlert] = useState<StreamAlert | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousAlertState = useRef<'none' | 'frame_drop' | 'bitrate'>('none');

  // Play audio alert beep with Web Audio API
  const playAlertSound = (type: 'warning' | 'critical') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type === 'critical' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(type === 'critical' ? 880 : 587, audioCtx.currentTime); // A5 or D5
      osc.frequency.exponentialRampToValueAtTime(type === 'critical' ? 440 : 880, audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext muted or not allowed without user gesture
    }
  };

  // Check conditions on every stats update
  useEffect(() => {
    // Only monitor if stream is active or simulated active
    const frameDropExceeded = stats.frameDropPercent > 5.0;
    
    // Bitrate fluctuation: sharp drop below 4,500 kb/s (over 30% drop from 6,500 target) while streaming
    const bitrateFluctuation = isStreaming && (stats.bitrate > 0 && stats.bitrate < 4500);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (frameDropExceeded) {
      if (previousAlertState.current !== 'frame_drop') {
        const alert: StreamAlert = {
          id: `alert_drop_${Date.now()}`,
          type: 'frame_drop',
          severity: 'critical',
          title: '🚨 ALERTA CRÍTICA: Pérdida de Cuadros > 5%',
          message: `La tasa de cuadros perdidos ha subido al ${stats.frameDropPercent.toFixed(1)}% (umbral de seguridad: 5.0%). Tus espectadores están experimentando cortes y congelamiento de video.`,
          metricValue: `${stats.frameDropPercent.toFixed(1)}% pérdidas`,
          recommendation: 'Baja el bitrate en 1,500 kbps o cambia el preset del codificador en OBS a "Very Fast" / Rendimiento.',
          timestamp: nowTime
        };
        setActiveAlert(alert);
        setShowToast(true);
        onAlertChange(alert);
        playAlertSound('critical');
        previousAlertState.current = 'frame_drop';
      }
    } else if (bitrateFluctuation) {
      if (previousAlertState.current !== 'bitrate') {
        const dropPercent = Math.round(((stats.targetBitrate - stats.bitrate) / stats.targetBitrate) * 100);
        const alert: StreamAlert = {
          id: `alert_bitrate_${Date.now()}`,
          type: 'bitrate_fluctuation',
          severity: 'warning',
          title: '⚠️ ALERTA: Fluctuación Severa de Bitrate',
          message: `El flujo de subida ha caído a ${stats.bitrate} kb/s (caída del ${dropPercent}% respecto al objetivo de ${stats.targetBitrate} kb/s). Inestabilidad detectada en la conexión a Kick/Twitch.`,
          metricValue: `${stats.bitrate} kb/s (-${dropPercent}%)`,
          recommendation: 'Verifica la saturación de tu router o activa "Ajuste dinámico de bitrate por congestión" en OBS.',
          timestamp: nowTime
        };
        setActiveAlert(alert);
        setShowToast(true);
        onAlertChange(alert);
        playAlertSound('warning');
        previousAlertState.current = 'bitrate';
      }
    } else {
      // Conditions nominal
      if (previousAlertState.current !== 'none') {
        // Recovery notice
        onAlertChange(null);
        setActiveAlert(null);
        setShowToast(false);
        previousAlertState.current = 'none';
      }
    }
  }, [stats.frameDropPercent, stats.bitrate, stats.targetBitrate, isStreaming]);

  const handleDismiss = () => {
    setShowToast(false);
  };

  const handleRestoreNominal = () => {
    obsController.restoreNominalNetwork();
    setShowToast(false);
  };

  if (!showToast || !activeAlert) return null;

  const isCritical = activeAlert.severity === 'critical';

  return (
    <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div
        className={`rounded-xl border p-4 shadow-2xl backdrop-blur-xl ${
          isCritical
            ? 'bg-neutral-950/95 border-red-500/80 shadow-red-950/50 ring-1 ring-red-500/50'
            : 'bg-neutral-950/95 border-amber-500/80 shadow-amber-950/50 ring-1 ring-amber-500/50'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isCritical ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
              }`}
            >
              {isCritical ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wide uppercase text-white font-display">
                {activeAlert.title}
              </h4>
              <span className="text-[10px] font-mono text-neutral-400">{activeAlert.timestamp} · Monitor OBS</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
              title={soundEnabled ? 'Silenciar alertas audibles' : 'Activar sonido'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-600" />}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-neutral-400 hover:text-white rounded"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-2.5 space-y-2">
          <p className="text-xs text-neutral-200 leading-relaxed">{activeAlert.message}</p>

          {/* Metric Comparison Pill */}
          <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className="text-neutral-400">Medición Actual:</span>
            <span className={`font-bold tabular-nums ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
              {activeAlert.metricValue}
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 bg-neutral-900/40 p-2 rounded border border-neutral-800/60 leading-normal">
            <strong className="text-neutral-300">Recomendación:</strong> {activeAlert.recommendation}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={handleRestoreNominal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors font-medium text-[11px]"
          >
            <RotateCcw className="w-3 h-3 text-emerald-400" />
            <span>Restablecer Red</span>
          </button>

          <button
            onClick={() => {
              onNavigateToTelemetry();
              handleDismiss();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
              isCritical
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black'
            }`}
          >
            <span>Ver Gráfico Recharts</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
