export type PlatformType = 'kick' | 'twitch' | 'both';

export interface SceneSource {
  id: string;
  name: string;
  type: 'camera' | 'game' | 'overlay' | 'browser' | 'audio' | 'image';
  visible: boolean;
  locked: boolean;
}

export interface OBSScene {
  id: string;
  name: string;
  thumbnailUrl?: string;
  active: boolean;
  sources: SceneSource[];
}

export interface AudioChannel {
  id: string;
  name: string;
  type: 'desktop' | 'mic' | 'music' | 'discord' | 'alerts';
  volume: number; // 0 to 1
  volumeDb: number; // e.g. -60 to 0
  muted: boolean;
  peak: number; // 0 to 1 for animated VU meter
}

export interface OBSStats {
  fps: number;
  cpu: number;
  memory: number;
  bitrate: number;
  targetBitrate: number;
  droppedFrames: number;
  totalFrames: number;
  frameDropPercent: number;
  uptimeSeconds: number;
}

export interface StreamAlert {
  id: string;
  type: 'frame_drop' | 'bitrate_fluctuation' | 'recovered';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  metricValue: string;
  recommendation: string;
  timestamp: string;
  dismissed?: boolean;
}

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  icon: 'chat' | 'game' | 'pause' | 'start' | 'trophy' | 'custom';
  sceneId: string;
  transition: TransitionType;
  transitionDurationMs: number;
  sourcesConfig: { [sourceId: string]: boolean };
  audioVolumes: { [channelId: string]: number };
  audioMutes: { [channelId: string]: boolean };
  isDefault?: boolean;
}

export interface HighlightSegment {
  id: string;
  title: string;
  streamTimestamp: string;
  uptimeSeconds: number;
  durationSeconds: number;
  triggerType: 'audio_spike' | 'chat_velocity' | 'manual_marker' | 'combo_hype';
  triggerDetail: string;
  intensity: number; // 0 to 100
  gameCategory: string;
  sceneName: string;
  thumbnailUrl: string;
  tags: string[];
  chatSnippet?: string[];
  status: 'marked' | 'ready' | 'exported';
  obsReplaySaved: boolean;
  notes?: string;
}

export interface HighlightDetectorSettings {
  enabled: boolean;
  audioThresholdDb: number; // e.g. -4 dB
  chatVelocityThreshold: number; // msgs per 30 seconds
  autoTriggerReplayBuffer: boolean;
  clipDurationSeconds: number;
  cooldownSeconds: number;
}

export interface PlatformAnchorConfig {
  twitch: {
    server: string;
    streamKey: string;
    channelId: string;
    pingMs: number;
    connected: boolean;
    autoReconnect: boolean;
  };
  kick: {
    server: string;
    streamKey: string;
    channelSlug: string;
    pingMs: number;
    connected: boolean;
    autoReconnect: boolean;
  };
  obs: {
    host: string;
    port: number;
    password: string;
    autoConnect: boolean;
    connected: boolean;
    version: string;
  };
}

export type TransitionType = 'Cut' | 'Fade' | 'Stinger Neon' | 'Slide Left' | 'Luma Wipe';

export interface OBSState {
  connected: boolean;
  isVirtual: boolean;
  host: string;
  port: number;
  password?: string;
  activeSceneId: string;
  scenes: OBSScene[];
  audioChannels: AudioChannel[];
  currentTransition: TransitionType;
  transitionDurationMs: number;
  isTransitioning: boolean;
  streaming: boolean;
  recording: boolean;
  recordingPaused: boolean;
  virtualCam: boolean;
  replayBuffer: boolean;
  stats: OBSStats;
}

export interface PlatformConfig {
  enabled: boolean;
  channelName: string;
  channelAvatar: string;
  channelBanner: string;
  streamTitle: string;
  gameCategory: string;
  tags: string[];
  viewers: number;
  followers: number;
  streamKey: string;
  delaySeconds: number;
  isLive: boolean;
  chatSlowMode: boolean;
  chatSubOnly: boolean;
  chatFollowersOnly: boolean;
}

export interface ChatBadge {
  type: 'broadcaster' | 'mod' | 'vip' | 'sub' | 'founder' | 'verified';
  label: string;
}

export interface UnifiedChatMessage {
  id: string;
  platform: 'kick' | 'twitch';
  username: string;
  userColor: string;
  badges: ChatBadge[];
  text: string;
  timestamp: string;
  isHighlighted?: boolean;
}

export interface ThumbnailLayer {
  id: string;
  type: 'text' | 'badge' | 'sticker' | 'streamer' | 'border';
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  rotation?: number;
  visible: boolean;
  stickerType?: 'arrow' | 'fire' | 'kick_logo' | 'twitch_logo' | 'live_badge' | 'drop_badge';
}

export interface ThumbnailProject {
  id: string;
  title: string;
  backgroundType: 'image' | 'gradient' | 'color';
  backgroundImageUrl: string;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  streamerImage: string;
  showStreamerCutout: boolean;
  streamerPosition: 'right' | 'left' | 'center';
  streamerGlow: boolean;
  headlineText: string;
  headlineColor: string;
  headlineStroke: string;
  sublineText: string;
  badgeText: string;
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  saturation: number; // -50 to 50
  vignette: boolean;
  borderGlowColor: string;
  showBorders: boolean;
  layers: ThumbnailLayer[];
}
