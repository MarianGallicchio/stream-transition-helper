import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OBSCommander } from './components/OBSCommander';
import { BroadcastManager } from './components/BroadcastManager';
import { ThumbnailStudio } from './components/ThumbnailStudio';
import { ChannelAssetsManager } from './components/ChannelAssetsManager';
import { StreamDeckMacros } from './components/StreamDeckMacros';
import { BroadcastAlertSystem } from './components/BroadcastAlertSystem';
import { StreamAnchorSetup } from './components/StreamAnchorSetup';
import { ReactiveVirtualCam } from './components/ReactiveVirtualCam';
import { HighlightDetectorManager } from './components/HighlightDetectorManager';
import { obsController } from './services/obsController';
import { OBSState, PlatformConfig, UnifiedChatMessage, StreamAlert } from './types/stream';

const INITIAL_KICK_CONFIG: PlatformConfig = {
  enabled: false,
  channelName: '',
  channelAvatar: '',
  channelBanner: '',
  streamTitle: '',
  gameCategory: '',
  tags: [],
  viewers: 0,
  followers: 0,
  streamKey: '',
  delaySeconds: 0,
  isLive: false,
  chatSlowMode: false,
  chatSubOnly: false,
  chatFollowersOnly: false
};

const INITIAL_TWITCH_CONFIG: PlatformConfig = {
  enabled: false,
  channelName: '',
  channelAvatar: '',
  channelBanner: '',
  streamTitle: '',
  gameCategory: '',
  tags: [],
  viewers: 0,
  followers: 0,
  streamKey: '',
  delaySeconds: 0,
  isLive: false,
  chatSlowMode: false,
  chatSubOnly: false,
  chatFollowersOnly: false
};

const INITIAL_CHAT_MESSAGES: UnifiedChatMessage[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<'obs' | 'highlights' | 'cam' | 'anchor' | 'stream' | 'thumbnails' | 'channel' | 'macros'>('obs');
  const [obsState, setObsState] = useState<OBSState>(obsController.getState());
  const [kickConfig, setKickConfig] = useState<PlatformConfig>(INITIAL_KICK_CONFIG);
  const [twitchConfig, setTwitchConfig] = useState<PlatformConfig>(INITIAL_TWITCH_CONFIG);
  const [chatMessages, setChatMessages] = useState<UnifiedChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentAlert, setCurrentAlert] = useState<StreamAlert | null>(null);
  const [thumbnailPrefill, setThumbnailPrefill] = useState<{ headline?: string; backgroundUrl?: string } | null>(null);

  // Subscribe to real-time OBS state changes
  useEffect(() => {
    const unsubscribe = obsController.subscribe((newState) => {
      setObsState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Sin chat simulado: los mensajes llegan solo de Kick/Twitch reales o del propio streamer.
  // (Se eliminó el generador automático de mensajes falsos cada 6s).

  // Dual Broadcast Toggle
  const handleToggleGlobalStream = () => {
    const nextState = !obsState.streaming;
    obsController.toggleStreaming(nextState);
    setKickConfig(prev => ({ ...prev, isLive: nextState }));
    setTwitchConfig(prev => ({ ...prev, isLive: nextState }));

    showToast(nextState ? '¡Transmisión dual iniciada en Kick y Twitch!' : 'Transmisión detenida en ambas plataformas.');
  };

  const handleUpdateKick = (config: Partial<PlatformConfig>) => {
    setKickConfig(prev => ({ ...prev, ...config }));
  };

  const handleUpdateTwitch = (config: Partial<PlatformConfig>) => {
    setTwitchConfig(prev => ({ ...prev, ...config }));
  };

  // Synchronize stream metadata across both Kick and Twitch
  const handleSyncBoth = (title: string, category: string, description: string, tags: string[]) => {
    setKickConfig(prev => ({ ...prev, streamTitle: title, gameCategory: category, tags }));
    setTwitchConfig(prev => ({ ...prev, streamTitle: title, gameCategory: category, tags }));
    showToast('¡Metadatos sincronizados en Kick y Twitch!');
  };

  // Send message to live chat
  const handleSendMessage = (text: string, target: 'kick' | 'twitch' | 'both') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsgs: UnifiedChatMessage[] = [];
    if (target === 'both' || target === 'twitch') {
      newMsgs.push({
        id: `send_tw_${Date.now()}`,
        platform: 'twitch',
        username: twitchConfig.channelName,
        userColor: '#a855f7',
        badges: [{ type: 'broadcaster', label: 'STREAMER' }],
        text,
        timestamp,
        isHighlighted: true
      });
    }
    if (target === 'both' || target === 'kick') {
      newMsgs.push({
        id: `send_k_${Date.now()}`,
        platform: 'kick',
        username: kickConfig.channelName,
        userColor: '#53fc18',
        badges: [{ type: 'broadcaster', label: 'STREAMER' }],
        text,
        timestamp,
        isHighlighted: true
      });
    }

    setChatMessages(prev => [...prev, ...newMsgs]);
  };

  // Set generated thumbnail to stream
  const handleApplyThumbnailToStream = (dataUrl: string) => {
    setKickConfig(prev => ({ ...prev, channelBanner: dataUrl }));
    setTwitchConfig(prev => ({ ...prev, channelBanner: dataUrl }));
    showToast('¡Nueva miniatura configurada para Kick y Twitch!');
  };

  const handleUpdateAvatar = (avatarUrl: string, target: 'kick' | 'twitch' | 'both') => {
    if (target === 'both' || target === 'kick') {
      setKickConfig(prev => ({ ...prev, channelAvatar: avatarUrl }));
    }
    if (target === 'both' || target === 'twitch') {
      setTwitchConfig(prev => ({ ...prev, channelAvatar: avatarUrl }));
    }
    showToast('Avatar actualizado con éxito.');
  };

  const handleUpdateBanner = (bannerUrl: string, target: 'kick' | 'twitch' | 'both') => {
    if (target === 'both' || target === 'kick') {
      setKickConfig(prev => ({ ...prev, channelBanner: bannerUrl }));
    }
    if (target === 'both' || target === 'twitch') {
      setTwitchConfig(prev => ({ ...prev, channelBanner: bannerUrl }));
    }
    showToast('Banner de canal actualizado con éxito.');
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      
      {/* Top Bar Contract (3 zones) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isStreaming={obsState.streaming}
        onToggleStream={handleToggleGlobalStream}
        kickLive={kickConfig.isLive}
        twitchLive={twitchConfig.isLive}
        isObsConnected={obsState.connected}
        isVirtualObs={obsState.isVirtual}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Dynamic Tab Views */}
        {activeTab === 'obs' && (
          <OBSCommander
            obsState={obsState}
            chatMessages={chatMessages}
            gameCategory={kickConfig.gameCategory}
            onSendToThumbnail={(headline, bgUrl) => {
              setThumbnailPrefill({ headline, backgroundUrl: bgUrl });
              setActiveTab('thumbnails');
              showToast('¡Highlight enviado al Editor de Miniaturas IA!');
            }}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'highlights' && (
          <HighlightDetectorManager
            obsState={obsState}
            chatMessages={chatMessages}
            gameCategory={kickConfig.gameCategory}
            onSendToThumbnail={(headline, bgUrl) => {
              setThumbnailPrefill({ headline, backgroundUrl: bgUrl });
              setActiveTab('thumbnails');
              showToast('¡Highlight enviado al Editor de Miniaturas IA!');
            }}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'cam' && (
          <ReactiveVirtualCam
            onSetAsAvatar={(url) => {
              handleUpdateAvatar(url, 'both');
              showToast('¡Personaje configurado como Avatar de Kick y Twitch!');
            }}
            onSendToThumbnail={(url) => {
              handleApplyThumbnailToStream(url);
              setActiveTab('thumbnails');
              showToast('¡Personaje transferido al Editor de Miniaturas!');
            }}
          />
        )}

        {activeTab === 'anchor' && (
          <StreamAnchorSetup
            kickConfig={kickConfig}
            twitchConfig={twitchConfig}
            onUpdateKick={handleUpdateKick}
            onUpdateTwitch={handleUpdateTwitch}
            isObsConnected={obsState.connected}
          />
        )}

        {activeTab === 'stream' && (
          <BroadcastManager
            kickConfig={kickConfig}
            twitchConfig={twitchConfig}
            onUpdateKick={handleUpdateKick}
            onUpdateTwitch={handleUpdateTwitch}
            onSyncBoth={handleSyncBoth}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
            isStreaming={obsState.streaming}
            onToggleGlobalStream={handleToggleGlobalStream}
          />
        )}

        {activeTab === 'thumbnails' && (
          <ThumbnailStudio
            onApplyThumbnailToStream={handleApplyThumbnailToStream}
            initialHeadlineText={thumbnailPrefill?.headline}
            initialBackgroundUrl={thumbnailPrefill?.backgroundUrl}
          />
        )}

        {activeTab === 'channel' && (
          <ChannelAssetsManager
            kickConfig={kickConfig}
            twitchConfig={twitchConfig}
            onUpdateAvatar={handleUpdateAvatar}
            onUpdateBanner={handleUpdateBanner}
          />
        )}

        {activeTab === 'macros' && (
          <StreamDeckMacros
            onTriggerAction={(actionName) => showToast(`Macro activado: ${actionName}`)}
          />
        )}

      </main>

      {/* Real-time Broadcast Alert & Notification System */}
      <BroadcastAlertSystem
        stats={obsState.stats}
        isStreaming={obsState.streaming}
        onNavigateToTelemetry={() => setActiveTab('obs')}
        onAlertChange={(alert) => setCurrentAlert(alert)}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-neutral-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Dynamic Footer with Real-Time Broadcast Alert State */}
      <footer
        className={`border-t transition-colors duration-300 py-3.5 px-6 text-xs ${
          currentAlert
            ? currentAlert.severity === 'critical'
              ? 'bg-red-950/95 border-red-500/80 text-red-200 shadow-[0_-4px_20px_rgba(239,68,68,0.25)]'
              : 'bg-amber-950/95 border-amber-500/80 text-amber-200 shadow-[0_-4px_20px_rgba(245,158,11,0.25)]'
            : 'bg-neutral-950/90 border-neutral-900 text-neutral-400'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {currentAlert ? (
            /* Visual Alert Active in Footer */
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    currentAlert.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    currentAlert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                </span>

                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span className="uppercase tracking-wider font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/40 border border-current">
                      {currentAlert.severity === 'critical' ? 'ALERTA CRÍTICA' : 'ADVERTENCIA'}
                    </span>
                    <span>{currentAlert.title}</span>
                    <span className="font-mono tabular-nums font-black underline">{currentAlert.metricValue}</span>
                  </div>
                  <div className="text-[11px] opacity-90 hidden sm:block">
                    {currentAlert.recommendation}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentAlert(null)}
                  className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 text-white font-semibold text-[11px] transition-colors border border-current"
                >
                  Marcar como revisado
                </button>
                <button
                  onClick={() => setActiveTab('obs')}
                  className={`px-3 py-1 rounded font-bold text-[11px] transition-colors ${
                    currentAlert.severity === 'critical'
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
                  }`}
                >
                  Ver Telemetría Recharts →
                </button>
                <button
                  onClick={() => setCurrentAlert(null)}
                  className="px-2 py-1 rounded opacity-70 hover:opacity-100 text-[11px]"
                >
                  Descartar
                </button>
              </div>
            </div>
          ) : (
            /* Nominal Broadcast Footer */
            <>
              <div className="flex items-center gap-3">
                <span className="font-bold text-neutral-300">StreamHub Studio</span>
                <span>·</span>
                <span>OBS WebSocket v5 Protocol</span>
                <span>·</span>
                <span className="text-purple-400 font-semibold">Twitch API Ready</span>
                <span>·</span>
                <span className="text-emerald-400 font-semibold">Kick Streaming Suite</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 font-bold" style={{ color: obsState.connected ? '#34d399' : '#9ca3af' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: obsState.connected ? '#10b981' : '#6b7280' }} />
                  {obsState.connected ? `OBS conectado (${obsState.stats.frameDropPercent.toFixed(2)}% drops)` : 'OBS no conectado'}
                </span>
                <span>·</span>
                <span>{obsState.connected ? `${obsState.stats.bitrate} kb/s · ${obsState.stats.fps.toFixed(0)} FPS` : 'Sin telemetría: conecta OBS real'}</span>
              </div>
            </>
          )}

        </div>
      </footer>

    </div>
  );
}
