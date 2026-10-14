import { OBSState, OBSScene, AudioChannel, TransitionType } from '../types/stream';

// Plantillas locales vacías: NO son datos de tu PC ni de OBS.
// Se cargan solo si el usuario lo pide explícitamente ("Cargar plantilla local").
// Por defecto el estado es desconectado y vacío para no mostrar simulados.
export const LOCAL_SCENE_TEMPLATES: OBSScene[] = [
  {
    id: 'scene_starting',
    name: '01. Empezando Pronto (Starting Soon)',
    active: false,
    sources: [
      { id: 'src_bg_countdown', name: 'Video Loop Fondo', type: 'browser', visible: true, locked: true },
      { id: 'src_timer', name: 'Contador Regresivo', type: 'browser', visible: true, locked: true },
      { id: 'src_music_overlay', name: 'Widget Música', type: 'browser', visible: true, locked: false },
      { id: 'src_socials', name: 'Barra de Redes', type: 'overlay', visible: true, locked: true },
    ]
  },
  {
    id: 'scene_chatting',
    name: '02. Charla Principal (Just Chatting)',
    active: true,
    sources: [
      { id: 'src_cam_main', name: 'Webcam Principal', type: 'camera', visible: true, locked: false },
      { id: 'src_cam_frame', name: 'Marco Reactivo', type: 'overlay', visible: true, locked: true },
      { id: 'src_chatbox', name: 'Overlay Chat Unificado', type: 'browser', visible: true, locked: false },
      { id: 'src_alerts', name: 'Alertas Donaciones y Subs', type: 'browser', visible: true, locked: true },
      { id: 'src_sponsor', name: 'Logo Sponsor', type: 'image', visible: false, locked: false },
    ]
  },
  {
    id: 'scene_gameplay',
    name: '03. Modo Gaming (Gameplay Screen)',
    active: false,
    sources: [
      { id: 'src_game_capture', name: 'Captura de Juego', type: 'game', visible: true, locked: true },
      { id: 'src_cam_corner', name: 'Facecam Esquina', type: 'camera', visible: true, locked: false },
      { id: 'src_chat_transparent', name: 'Chat Flotante', type: 'browser', visible: true, locked: false },
      { id: 'src_recent_event', name: 'Último Follow / Sub', type: 'overlay', visible: true, locked: true },
    ]
  },
  {
    id: 'scene_brb',
    name: '04. Ya Vuelvo (BRB / Pausa)',
    active: false,
    sources: [
      { id: 'src_brb_bg', name: 'Fondo Intermission', type: 'browser', visible: true, locked: true },
      { id: 'src_brb_text', name: 'Texto "Enseguida Volvemos"', type: 'overlay', visible: true, locked: true },
      { id: 'src_brb_clip', name: 'Reproductor Clips', type: 'browser', visible: true, locked: false },
    ]
  },
  {
    id: 'scene_ending',
    name: '05. Despedida y Raid (Stream Ending)',
    active: false,
    sources: [
      { id: 'src_ending_bg', name: 'Créditos Sesión', type: 'browser', visible: true, locked: true },
      { id: 'src_raid_target', name: 'Objetivo Raid', type: 'overlay', visible: true, locked: false },
      { id: 'src_top_supporters', name: 'Top Donadores', type: 'overlay', visible: true, locked: true },
    ]
  }
];

const ZERO_STATS: OBSState['stats'] = {
  fps: 0,
  cpu: 0,
  memory: 0,
  bitrate: 0,
  targetBitrate: 0,
  droppedFrames: 0,
  totalFrames: 0,
  frameDropPercent: 0,
  uptimeSeconds: 0,
};

export class OBSController {
  private state: OBSState;
  private ws: WebSocket | null = null;
  private subscribers: Array<(state: OBSState) => void> = [];

  constructor() {
    this.state = {
      connected: false,
      isVirtual: false,
      host: 'localhost',
      port: 4455,
      password: '',
      activeSceneId: '',
      scenes: [],
      audioChannels: [],
      currentTransition: 'Cut',
      transitionDurationMs: 300,
      isTransitioning: false,
      streaming: false,
      recording: false,
      recordingPaused: false,
      virtualCam: false,
      replayBuffer: false,
      stats: { ...ZERO_STATS },
    };
  }

  public getState(): OBSState {
    return { ...this.state, scenes: [...this.state.scenes], audioChannels: [...this.state.audioChannels], stats: { ...this.state.stats } };
  }

  public subscribe(callback: (state: OBSState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getState());
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.subscribers.forEach(cb => cb(currentState));
  }

  /** Carga plantillas locales editables. NO es conexión real a OBS. */
  public loadLocalTemplate() {
    if (this.state.scenes.length > 0) return;
    this.state.scenes = LOCAL_SCENE_TEMPLATES.map(s => ({ ...s, sources: [...s.sources] }));
    const active = this.state.scenes.find(s => s.active) || this.state.scenes[0];
    this.state.activeSceneId = active?.id || '';
    this.notify();
  }

  /** Setea canales de audio reales detectados con enumerateDevices o desde OBS. */
  public setRealAudioChannels(channels: AudioChannel[]) {
    this.state.audioChannels = channels;
    this.notify();
  }

  /** Actualiza stats reales (desde OBS o desde /api/system/info). */
  public updateRealStats(partial: Partial<OBSState['stats']>) {
    this.state.stats = { ...this.state.stats, ...partial };
    this.notify();
  }

  // Conecta a OBS real. Si falla, queda desconectado (sin modo virtual simulado).
  public async connect(host: string, port: number, password?: string): Promise<boolean> {
    this.state.host = host;
    this.state.port = port;
    this.state.password = password;

    try {
      if (this.ws) {
        try { this.ws.close(); } catch {}
      }

      const socketUrl = `ws://${host}:${port}`;
      this.ws = new WebSocket(socketUrl);

      return new Promise((resolve) => {
        let settled = false;
        const done = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          this.state.connected = ok;
          this.state.isVirtual = false;
          this.notify();
          resolve(ok);
        };
        const timeout = setTimeout(() => {
          console.warn('[OBS] Sin respuesta en ' + socketUrl + '. Activa WebSocket server en OBS.');
          try { this.ws?.close(); } catch {}
          done(false);
        }, 3500);

        this.ws!.onopen = () => {
          console.log('[OBS] Conectado a OBS Studio real.');
          done(true);
        };

        this.ws!.onerror = () => {
          console.warn('[OBS] No se detectó OBS real en ' + socketUrl);
          done(false);
        };

        this.ws!.onclose = () => {
          if (this.state.connected) {
            this.state.connected = false;
            this.notify();
          }
        };
      });
    } catch {
      this.state.connected = false;
      this.state.isVirtual = false;
      this.notify();
      return false;
    }
  }

  public disconnect() {
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.state.connected = false;
    this.state.isVirtual = false;
    this.state.streaming = false;
    this.notify();
  }

  // Cambio de escena (real si hay WS, local si hay plantilla cargada)
  public switchScene(sceneId: string) {
    if (!sceneId || this.state.activeSceneId === sceneId || this.state.isTransitioning) return;
    const scene = this.state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    this.state.isTransitioning = true;
    this.notify();

    if (this.state.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        op: 6,
        d: {
          requestType: 'SetCurrentProgramScene',
          requestId: `req_${Date.now()}`,
          requestData: { sceneName: scene.name }
        }
      }));
    }

    setTimeout(() => {
      this.state.activeSceneId = sceneId;
      this.state.scenes = this.state.scenes.map(s => ({
        ...s,
        active: s.id === sceneId
      }));
      this.state.isTransitioning = false;
      this.notify();
    }, this.state.transitionDurationMs);
  }

  public setTransition(transition: TransitionType, durationMs?: number) {
    this.state.currentTransition = transition;
    if (durationMs !== undefined) {
      this.state.transitionDurationMs = durationMs;
    }

    if (this.state.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        op: 6,
        d: {
          requestType: 'SetCurrentSceneTransition',
          requestId: `req_${Date.now()}`,
          requestData: { transitionName: transition }
        }
      }));
    }

    this.notify();
  }

  public toggleSourceVisibility(sceneId: string, sourceId: string) {
    this.state.scenes = this.state.scenes.map(scene => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        sources: scene.sources.map(src => {
          if (src.id !== sourceId) return src;
          const nextState = !src.visible;

          if (this.state.connected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              op: 6,
              d: {
                requestType: 'SetSceneItemEnabled',
                requestId: `req_${Date.now()}`,
                requestData: { sceneName: scene.name, sceneItemId: sourceId, sceneItemEnabled: nextState }
              }
            }));
          }

          return { ...src, visible: nextState };
        })
      };
    });

    this.notify();
  }

  public toggleSourceLock(sceneId: string, sourceId: string) {
    this.state.scenes = this.state.scenes.map(scene => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        sources: scene.sources.map(src => src.id === sourceId ? { ...src, locked: !src.locked } : src)
      };
    });
    this.notify();
  }

  public setAudioVolume(channelId: string, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    const volumeDb = clamped === 0 ? -60 : Math.round((20 * Math.log10(clamped)) * 10) / 10;

    this.state.audioChannels = this.state.audioChannels.map(ch => {
      if (ch.id !== channelId) return ch;
      return { ...ch, volume: clamped, volumeDb };
    });

    if (this.state.connected && this.ws?.readyState === WebSocket.OPEN) {
      const channel = this.state.audioChannels.find(c => c.id === channelId);
      if (channel) {
        this.ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'SetInputVolume',
            requestId: `req_${Date.now()}`,
            requestData: { inputName: channel.name, inputVolumeMul: clamped }
          }
        }));
      }
    }

    this.notify();
  }

  public toggleAudioMute(channelId: string) {
    this.state.audioChannels = this.state.audioChannels.map(ch => {
      if (ch.id !== channelId) return ch;
      const nextMuted = !ch.muted;

      if (this.state.connected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'SetInputMute',
            requestId: `req_${Date.now()}`,
            requestData: { inputName: ch.name, inputMuted: nextMuted }
          }
        }));
      }

      return { ...ch, muted: nextMuted };
    });

    this.notify();
  }

  /** Actualiza el pico real de un canal (desde AnalyserNode del mic real). */
  public setRealAudioPeak(channelId: string, peak: number) {
    const clamped = Math.max(0, Math.min(1, peak));
    this.state.audioChannels = this.state.audioChannels.map(ch =>
      ch.id === channelId ? { ...ch, peak: clamped } : ch
    );
    this.notify();
  }

  public toggleStreaming(forceState?: boolean) {
    this.state.streaming = forceState !== undefined ? forceState : !this.state.streaming;
    if (this.state.streaming && this.state.stats.uptimeSeconds === 0) {
      this.state.stats.uptimeSeconds = 1;
    }
    this.notify();
  }

  public toggleRecording() {
    this.state.recording = !this.state.recording;
    if (!this.state.recording) {
      this.state.recordingPaused = false;
    }
    this.notify();
  }

  public togglePauseRecording() {
    if (!this.state.recording) return;
    this.state.recordingPaused = !this.state.recordingPaused;
    this.notify();
  }

  public toggleVirtualCam() {
    this.state.virtualCam = !this.state.virtualCam;
    this.notify();
  }

  public toggleReplayBuffer() {
    this.state.replayBuffer = !this.state.replayBuffer;
    this.notify();
  }

  public saveReplayBuffer(): boolean {
    if (!this.state.connected || this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[OBS] Replay Buffer solo disponible con OBS real conectado.');
      return false;
    }
    this.ws.send(JSON.stringify({
      op: 6,
      d: {
        requestType: 'SaveReplayBuffer',
        requestId: `req_save_replay_${Date.now()}`
      }
    }));
    return true;
  }

  // ---- Métodos deprecados (antes simulaban red/audio). Se mantienen como no-op para no romper imports.
  public triggerAudioSpike(): void {
    console.warn('[OBS] triggerAudioSpike eliminado: usa micrófono real.');
  }
  public simulateHighFrameDrops(): void {
    console.warn('[OBS] Simulación eliminada: conecta OBS real para telemetría.');
  }
  public simulateBitrateDrop(): void {
    console.warn('[OBS] Simulación eliminada: conecta OBS real para telemetría.');
  }
  public restoreNominalNetwork(): void {
    this.state.stats.frameDropPercent = 0;
    this.state.stats.droppedFrames = 0;
    this.notify();
  }

  public cleanup() {
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
}

// Singleton instance
export const obsController = new OBSController();
