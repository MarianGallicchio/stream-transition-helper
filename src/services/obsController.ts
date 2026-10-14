import { OBSState, OBSScene, AudioChannel, TransitionType, SceneSource } from '../types/stream';

// Default initial state with broadcast ready scenes and sources
export const INITIAL_OBS_SCENES: OBSScene[] = [
  {
    id: 'scene_starting',
    name: '01. Empezando Pronto (Starting Soon)',
    active: false,
    sources: [
      { id: 'src_bg_countdown', name: 'Video Loop Fondo Espacial', type: 'browser', visible: true, locked: true },
      { id: 'src_timer', name: 'Contador Regresivo 5:00', type: 'browser', visible: true, locked: true },
      { id: 'src_music_overlay', name: 'Widget Spotify Now Playing', type: 'browser', visible: true, locked: false },
      { id: 'src_socials', name: 'Barra de Redes Kick/Twitch', type: 'overlay', visible: true, locked: true },
    ]
  },
  {
    id: 'scene_chatting',
    name: '02. Charla Principal (Just Chatting)',
    active: true,
    sources: [
      { id: 'src_cam_main', name: 'Webcam Sony A6400 (4K Cam)', type: 'camera', visible: true, locked: false },
      { id: 'src_cam_frame', name: 'Marco RGB Neon Reactivo', type: 'overlay', visible: true, locked: true },
      { id: 'src_chatbox', name: 'Overlay Chat Unificado (Twitch + Kick)', type: 'browser', visible: true, locked: false },
      { id: 'src_alerts', name: 'Campana de Donaciones y Subs', type: 'browser', visible: true, locked: true },
      { id: 'src_sponsor', name: 'Logo Sponsor Rotativo', type: 'image', visible: false, locked: false },
    ]
  },
  {
    id: 'scene_gameplay',
    name: '03. Modo Gaming (Gameplay Screen)',
    active: false,
    sources: [
      { id: 'src_game_capture', name: 'Captura de Juego (DirectX 12 / Vulkan)', type: 'game', visible: true, locked: true },
      { id: 'src_cam_corner', name: 'Facecam Esquina Inferior Derecha', type: 'camera', visible: true, locked: false },
      { id: 'src_chat_transparent', name: 'Chat Flotante Transparente', type: 'browser', visible: true, locked: false },
      { id: 'src_recent_event', name: 'Último Follow / Sub Banner', type: 'overlay', visible: true, locked: true },
    ]
  },
  {
    id: 'scene_brb',
    name: '04. Ya Vuelvo (BRB / Pausa)',
    active: false,
    sources: [
      { id: 'src_brb_bg', name: 'Fondo Animado Chill Hop Intermission', type: 'browser', visible: true, locked: true },
      { id: 'src_brb_text', name: 'Texto "Enseguida Volvemos"', type: 'overlay', visible: true, locked: true },
      { id: 'src_brb_clip', name: 'Reproductor de Mejores Clips', type: 'browser', visible: true, locked: false },
    ]
  },
  {
    id: 'scene_ending',
    name: '05. Despedida y Raid (Stream Ending)',
    active: false,
    sources: [
      { id: 'src_ending_bg', name: 'Pantalla de Créditos de la Sesión', type: 'browser', visible: true, locked: true },
      { id: 'src_raid_target', name: 'Objetivo de Raid Kick/Twitch', type: 'overlay', visible: true, locked: false },
      { id: 'src_top_supporters', name: 'Top Donadores del Día', type: 'overlay', visible: true, locked: true },
    ]
  }
];

export const INITIAL_AUDIO_CHANNELS: AudioChannel[] = [
  { id: 'audio_mic', name: 'Micrófono Principal (Shure SM7B)', type: 'mic', volume: 0.85, volumeDb: -2.4, muted: false, peak: 0.65 },
  { id: 'audio_desktop', name: 'Audio de Juego / Sistema', type: 'desktop', volume: 0.70, volumeDb: -6.0, muted: false, peak: 0.45 },
  { id: 'audio_music', name: 'Música de Fondo (Spotify Streamer)', type: 'music', volume: 0.40, volumeDb: -14.2, muted: false, peak: 0.30 },
  { id: 'audio_discord', name: 'Discord / Amigos en Voz', type: 'discord', volume: 0.75, volumeDb: -4.8, muted: false, peak: 0.50 },
  { id: 'audio_alerts', name: 'Alertas y Efectos de Sonido', type: 'alerts', volume: 0.90, volumeDb: -1.0, muted: false, peak: 0.20 },
];

export class OBSController {
  private state: OBSState;
  private ws: WebSocket | null = null;
  private subscribers: Array<(state: OBSState) => void> = [];
  private audioPeakTimer: any = null;
  private statsTimer: any = null;

  constructor() {
    this.state = {
      connected: true, // Connected to Virtual OBS by default so streamer has immediate control
      isVirtual: true,
      host: 'localhost',
      port: 4455,
      password: '',
      activeSceneId: 'scene_chatting',
      scenes: INITIAL_OBS_SCENES,
      audioChannels: INITIAL_AUDIO_CHANNELS,
      currentTransition: 'Stinger Neon',
      transitionDurationMs: 400,
      isTransitioning: false,
      streaming: false,
      recording: false,
      recordingPaused: false,
      virtualCam: false,
      replayBuffer: false,
      stats: {
        fps: 60.0,
        cpu: 4.2,
        memory: 1840,
        bitrate: 6850,
        targetBitrate: 6500,
        droppedFrames: 14,
        totalFrames: 142000,
        frameDropPercent: 0.01,
        uptimeSeconds: 0,
      }
    };

    this.startVirtualEngine();
  }

  public getState(): OBSState {
    return { ...this.state };
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

  // Connect to real OBS WebSocket v5 or switch to Virtual
  public async connect(host: string, port: number, password?: string): Promise<boolean> {
    this.state.host = host;
    this.state.port = port;
    this.state.password = password;

    try {
      if (this.ws) {
        this.ws.close();
      }

      const socketUrl = `ws://${host}:${port}`;
      this.ws = new WebSocket(socketUrl);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[OBS] Connection to real OBS timed out, using Virtual Studio mode');
          this.state.connected = true;
          this.state.isVirtual = true;
          this.notify();
          resolve(false);
        }, 3000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          console.log('[OBS] Connected to local OBS Studio WebSocket!');
          this.state.connected = true;
          this.state.isVirtual = false;
          this.notify();
          resolve(true);
        };

        this.ws!.onerror = () => {
          clearTimeout(timeout);
          console.log('[OBS] Local OBS not detected, running in Virtual OBS Engine');
          this.state.connected = true;
          this.state.isVirtual = true;
          this.notify();
          resolve(false);
        };

        this.ws!.onclose = () => {
          if (!this.state.isVirtual) {
            this.state.isVirtual = true;
            this.notify();
          }
        };
      });
    } catch {
      this.state.connected = true;
      this.state.isVirtual = true;
      this.notify();
      return false;
    }
  }

  // Trigger Scene Switch with configured transition
  public switchScene(sceneId: string) {
    if (this.state.activeSceneId === sceneId || this.state.isTransitioning) return;

    this.state.isTransitioning = true;
    this.notify();

    // Send to real OBS if connected
    if (!this.state.isVirtual && this.ws?.readyState === WebSocket.OPEN) {
      const scene = this.state.scenes.find(s => s.id === sceneId);
      if (scene) {
        this.ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'SetCurrentProgramScene',
            requestId: `req_${Date.now()}`,
            requestData: { sceneName: scene.name }
          }
        }));
      }
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

  // Change Transition Effect & Duration
  public setTransition(transition: TransitionType, durationMs?: number) {
    this.state.currentTransition = transition;
    if (durationMs !== undefined) {
      this.state.transitionDurationMs = durationMs;
    }

    if (!this.state.isVirtual && this.ws?.readyState === WebSocket.OPEN) {
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

  // Toggle Source Visibility
  public toggleSourceVisibility(sceneId: string, sourceId: string) {
    this.state.scenes = this.state.scenes.map(scene => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        sources: scene.sources.map(src => {
          if (src.id !== sourceId) return src;
          const nextState = !src.visible;
          
          if (!this.state.isVirtual && this.ws?.readyState === WebSocket.OPEN) {
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

  // Toggle Source Lock
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

  // Audio Control: Volume & Mute
  public setAudioVolume(channelId: string, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    const volumeDb = clamped === 0 ? -60 : Math.round((20 * Math.log10(clamped)) * 10) / 10;

    this.state.audioChannels = this.state.audioChannels.map(ch => {
      if (ch.id !== channelId) return ch;
      return { ...ch, volume: clamped, volumeDb };
    });

    if (!this.state.isVirtual && this.ws?.readyState === WebSocket.OPEN) {
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

      if (!this.state.isVirtual && this.ws?.readyState === WebSocket.OPEN) {
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

  // Broadcast & Recording Toggles
  public toggleStreaming(forceState?: boolean) {
    this.state.streaming = forceState !== undefined ? forceState : !this.state.streaming;
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

  // Save current OBS Replay Buffer segment (last 30-60s)
  public saveReplayBuffer(): boolean {
    if (!this.state.replayBuffer) {
      this.state.replayBuffer = true;
    }

    if (!this.state.isVirtual && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        op: 6,
        d: {
          requestType: 'SaveReplayBuffer',
          requestId: `req_save_replay_${Date.now()}`
        }
      }));
      console.log('[OBS] Replay Buffer segment saved to disk');
    }

    this.notify();
    return true;
  }

  // Trigger high audio spike for highlight testing & simulation
  public triggerAudioSpike(channelId: string = 'audio_mic', peakDb: number = -0.8) {
    this.state.audioChannels = this.state.audioChannels.map(ch => {
      if (ch.id === channelId || (channelId === 'audio_mic' && ch.type === 'mic')) {
        return { ...ch, peak: 0.98, volumeDb: peakDb };
      }
      return ch;
    });
    this.notify();

    // Decay peak back after 1.8s
    setTimeout(() => {
      this.state.audioChannels = this.state.audioChannels.map(ch => {
        if (ch.id === channelId || (channelId === 'audio_mic' && ch.type === 'mic')) {
          return { ...ch, peak: 0.65, volumeDb: -2.4 };
        }
        return ch;
      });
      this.notify();
    }, 1800);
  }

  // Simulate Network Instability to trigger alerts
  public simulateHighFrameDrops(percent: number = 6.4) {
    this.state.stats.frameDropPercent = percent;
    this.state.stats.droppedFrames = Math.round((this.state.stats.totalFrames * percent) / 100);
    this.notify();
  }

  public simulateBitrateDrop(bitrate: number = 2950) {
    this.state.stats.bitrate = bitrate;
    this.notify();
  }

  public restoreNominalNetwork() {
    this.state.stats.frameDropPercent = 0.02;
    this.state.stats.droppedFrames = 28;
    this.state.stats.bitrate = 6820;
    this.state.stats.fps = 60.0;
    this.notify();
  }

  // Background virtual simulation loop (realistic audio VU meters + uptime)
  private startVirtualEngine() {
    this.audioPeakTimer = setInterval(() => {
      // Animate realistic audio VU meters based on volume and mute
      this.state.audioChannels = this.state.audioChannels.map(ch => {
        if (ch.muted) return { ...ch, peak: 0 };
        // Random fluctuation around volume
        const noise = (Math.random() - 0.4) * 0.25;
        const newPeak = Math.max(0, Math.min(1, ch.volume * 0.85 + noise));
        return { ...ch, peak: newPeak };
      });
      this.notify();
    }, 150);

    this.statsTimer = setInterval(() => {
      if (this.state.streaming) {
        this.state.stats.uptimeSeconds += 1;
        this.state.stats.totalFrames += 60;
        
        // If not under forced issue simulation, keep bitrate and drops nominal
        if (this.state.stats.frameDropPercent < 5.0 && this.state.stats.bitrate > 4500) {
          const jitter = Math.floor((Math.random() - 0.5) * 80);
          this.state.stats.bitrate = Math.max(6300, Math.min(7100, 6800 + jitter));
          this.state.stats.fps = 59.9 + Math.random() * 0.2;
          this.state.stats.frameDropPercent = 0.01;
        }
      }
      this.notify();
    }, 1000);
  }

  public cleanup() {
    if (this.audioPeakTimer) clearInterval(this.audioPeakTimer);
    if (this.statsTimer) clearInterval(this.statsTimer);
    if (this.ws) this.ws.close();
  }
}

// Singleton instance
export const obsController = new OBSController();
