import React, { useState } from 'react';
import {
  Radio, Play, Square, Sparkles, Send, MessageSquare,
  Shield, Check, Copy, Tag, RefreshCw, AlertCircle
} from 'lucide-react';
import { PlatformConfig, UnifiedChatMessage } from '../types/stream';

interface BroadcastManagerProps {
  kickConfig: PlatformConfig;
  twitchConfig: PlatformConfig;
  onUpdateKick: (config: Partial<PlatformConfig>) => void;
  onUpdateTwitch: (config: Partial<PlatformConfig>) => void;
  onSyncBoth: (title: string, category: string, description: string, tags: string[]) => void;
  chatMessages: UnifiedChatMessage[];
  onSendMessage: (text: string, targetPlatform: 'kick' | 'twitch' | 'both') => void;
  isStreaming: boolean;
  onToggleGlobalStream: () => void;
}

const POPULAR_CATEGORIES = [
  'Valorant',
  'Just Chatting / Charla',
  'Grand Theft Auto V',
  'Counter-Strike 2',
  'Fortnite',
  'League of Legends',
  'Minecraft',
  'Rust',
  'Apex Legends',
  'Elden Ring'
];

export const BroadcastManager: React.FC<BroadcastManagerProps> = ({
  kickConfig,
  twitchConfig,
  onUpdateKick,
  onUpdateTwitch,
  onSyncBoth,
  chatMessages,
  onSendMessage,
  isStreaming,
  onToggleGlobalStream
}) => {
  // Synchronized metadata form state
  const [title, setTitle] = useState(twitchConfig.streamTitle || '🔥 DIRECTO DUAL TRYHARD | TOP 1 EN VIVO');
  const [category, setCategory] = useState(twitchConfig.gameCategory || 'Valorant');
  const [description, setDescription] = useState(
    '¡Bienvenidos a la transmisión unificada en Kick y Twitch! Jugando partidas intensas con la comunidad. ¡Sigue el canal!'
  );
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['espanol', 'drops', 'gaming', 'kick', 'twitch', 'tryhard']);

  // Chat sender state
  const [chatInput, setChatInput] = useState('');
  const [chatTarget, setChatTarget] = useState<'both' | 'twitch' | 'kick'>('both');

  // AI Generator state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ titles: string[]; description: string; tags: string[] } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleApplyToBoth = () => {
    onSyncBoth(title, category, description, tags);
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 2500);
  };

  const handleGenerateAiMetadata = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          topic: title,
          tone: 'Competitivo, emocionante y amigable'
        })
      });
      const data = await res.json();
      if (data && data.titles) {
        setAiSuggestions(data);
      }
    } catch (err) {
      console.error('Error fetching AI metadata suggestions:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSelectAiTitle = (selectedTitle: string) => {
    setTitle(selectedTitle);
    if (aiSuggestions?.description) {
      setDescription(aiSuggestions.description);
    }
    if (aiSuggestions?.tags) {
      setTags(aiSuggestions.tags);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim(), chatTarget);
    setChatInput('');
  };

  const handleCopyLink = (platform: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(platform);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const totalViewers = (twitchConfig.isLive ? twitchConfig.viewers : 0) + (kickConfig.isLive ? kickConfig.viewers : 0);

  return (
    <div className="space-y-6">
      
      {/* Platform Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Twitch Card */}
        <div className="bg-neutral-900 border border-purple-900/40 rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-black text-purple-400 text-lg">
                TW
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Twitch Channel</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${twitchConfig.isLive ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60' : 'bg-neutral-800 text-neutral-400'}`}>
                    {twitchConfig.isLive ? '● EN VIVO' : 'OFFLINE'}
                  </span>
                </h3>
                <span className="text-xs text-neutral-400">twitch.tv/{twitchConfig.channelName}</span>
              </div>
            </div>

            <button
              onClick={() => onUpdateTwitch({ isLive: !twitchConfig.isLive })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                twitchConfig.isLive
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {twitchConfig.isLive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{twitchConfig.isLive ? 'Detener Twitch' : 'Iniciar Twitch'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-neutral-800/80 text-xs">
            <div>
              <span className="text-neutral-400 block text-[11px]">Espectadores</span>
              <span className="font-mono text-purple-400 font-bold text-sm tabular-nums">
                {twitchConfig.isLive ? twitchConfig.viewers.toLocaleString() : '0'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Seguidores</span>
              <span className="font-mono text-neutral-200 font-bold text-sm tabular-nums">
                {twitchConfig.followers.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Retardo</span>
              <span className="font-mono text-neutral-200 font-bold text-sm">Baja Latencia</span>
            </div>
          </div>

          {/* Quick Platform Settings */}
          <div className="pt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Modo Chat:</span>
              <button
                onClick={() => onUpdateTwitch({ chatSlowMode: !twitchConfig.chatSlowMode })}
                className={`px-2 py-0.5 rounded text-[11px] ${twitchConfig.chatSlowMode ? 'bg-purple-900/60 text-purple-300' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Lento (30s)
              </button>
              <button
                onClick={() => onUpdateTwitch({ chatSubOnly: !twitchConfig.chatSubOnly })}
                className={`px-2 py-0.5 rounded text-[11px] ${twitchConfig.chatSubOnly ? 'bg-purple-900/60 text-purple-300' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Sólo Subs
              </button>
            </div>
            <button
              onClick={() => handleCopyLink('twitch', `https://twitch.tv/${twitchConfig.channelName}`)}
              className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              {copiedLink === 'twitch' ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink === 'twitch' ? 'Copiado' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

        {/* Kick Card */}
        <div className="bg-neutral-900 border border-emerald-900/40 rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-lg">
                K
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Kick Channel</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${kickConfig.isLive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-neutral-800 text-neutral-400'}`}>
                    {kickConfig.isLive ? '● EN VIVO' : 'OFFLINE'}
                  </span>
                </h3>
                <span className="text-xs text-neutral-400">kick.com/{kickConfig.channelName}</span>
              </div>
            </div>

            <button
              onClick={() => onUpdateKick({ isLive: !kickConfig.isLive })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                kickConfig.isLive
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black'
              }`}
            >
              {kickConfig.isLive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{kickConfig.isLive ? 'Detener Kick' : 'Iniciar Kick'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-neutral-800/80 text-xs">
            <div>
              <span className="text-neutral-400 block text-[11px]">Espectadores</span>
              <span className="font-mono text-emerald-400 font-bold text-sm tabular-nums">
                {kickConfig.isLive ? kickConfig.viewers.toLocaleString() : '0'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Seguidores</span>
              <span className="font-mono text-neutral-200 font-bold text-sm tabular-nums">
                {kickConfig.followers.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Ingresos Sub</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">95% Split</span>
            </div>
          </div>

          {/* Quick Platform Settings */}
          <div className="pt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo Chat:</span>
              <button
                onClick={() => onUpdateKick({ chatSlowMode: !kickConfig.chatSlowMode })}
                className={`px-2 py-0.5 rounded text-[11px] ${kickConfig.chatSlowMode ? 'bg-emerald-950 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Lento (30s)
              </button>
              <button
                onClick={() => onUpdateKick({ chatSubOnly: !kickConfig.chatSubOnly })}
                className={`px-2 py-0.5 rounded text-[11px] ${kickConfig.chatSubOnly ? 'bg-emerald-950 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Sólo Subs
              </button>
            </div>
            <button
              onClick={() => handleCopyLink('kick', `https://kick.com/${kickConfig.channelName}`)}
              className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              {copiedLink === 'kick' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink === 'kick' ? 'Copiado' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Content: Metadata Synchronizer + Live Unified Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Synchronized Stream Metadata Editor (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Gestor Unificado de Información de Transmisión</span>
              </h3>
              <p className="text-xs text-neutral-400">Edita título, categoría, tags y descripción para Kick y Twitch en 1 clic</p>
            </div>

            <button
              onClick={handleGenerateAiMetadata}
              disabled={isGeneratingAi}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-emerald-500 hover:opacity-90 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingAi ? 'Generando con Gemini...' : 'Ideas con IA'}</span>
            </button>
          </div>

          {/* AI Suggestions Box (if generated) */}
          {aiSuggestions && (
            <div className="bg-neutral-950 border border-purple-800/40 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Sugerencias Virales de Gemini AI
                </span>
                <button
                  onClick={() => setAiSuggestions(null)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  Cerrar
                </button>
              </div>
              <div className="space-y-1.5">
                {aiSuggestions.titles.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAiTitle(t)}
                    className="w-full text-left p-2 rounded-lg bg-neutral-900/80 hover:bg-purple-950/40 border border-neutral-800 hover:border-purple-600/50 text-xs text-neutral-200 hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{t}</span>
                    <span className="text-[10px] text-purple-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      Usar Título →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-200">Título de la Transmisión</label>
              <span className={`font-mono text-[11px] ${title.length > 100 ? 'text-amber-400' : 'text-neutral-500'}`}>
                {title.length} / 140
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Escribe el título épico del stream..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 font-medium"
            />
          </div>

          {/* Category / Game Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-200">Categoría o Juego</label>
              <span className="text-neutral-500 text-[11px]">Sincroniza en el directorio de Kick y Twitch</span>
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Buscar o escribir categoría..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            
            {/* Quick Category Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                    category === cat
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-200">Etiquetas del Canal (Tags)</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-950 border border-neutral-700 rounded-lg min-h-[42px] items-center">
              {tags.map((t) => (
                <span
                  key={t}
                  className="bg-neutral-800 text-neutral-200 text-xs px-2.5 py-0.5 rounded flex items-center gap-1.5 font-mono"
                >
                  <span>#{t}</span>
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="text-neutral-400 hover:text-red-400 text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Presiona Enter para agregar tag..."
                className="bg-transparent text-xs text-white focus:outline-none flex-1 min-w-[120px]"
              />
            </div>
          </div>

          {/* Stream Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-200">Descripción del Stream</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Información para los espectadores, enlaces de donación y reglas del chat..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Apply Synchronized Button */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
              {appliedNotice && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> ¡Configuración actualizada en Kick y Twitch!
                </span>
              )}
            </div>

            <button
              onClick={handleApplyToBoth}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-emerald-950/40"
            >
              Aplicar a Kick y Twitch
            </button>
          </div>
        </div>

        {/* Right Column: Unified Live Chat Feed (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col h-[560px]">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-sm">Chat Unificado en Vivo</h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-purple-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Twitch
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Kick
              </span>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 text-xs p-4">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <span>Esperando mensajes de los espectadores...</span>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-xs p-2 rounded-lg transition-colors ${
                    msg.isHighlighted
                      ? 'bg-purple-950/30 border border-purple-800/40'
                      : 'hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Platform Tag */}
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded font-black ${
                        msg.platform === 'kick'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : 'bg-purple-950 text-purple-400 border border-purple-800/50'
                      }`}
                    >
                      {msg.platform === 'kick' ? 'KICK' : 'TWITCH'}
                    </span>

                    {/* Badges */}
                    {msg.badges.map((b, i) => (
                      <span
                        key={i}
                        className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          b.type === 'broadcaster'
                            ? 'bg-red-950 text-red-400'
                            : b.type === 'mod'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-purple-900/60 text-purple-300'
                        }`}
                      >
                        {b.label}
                      </span>
                    ))}

                    {/* Username */}
                    <span className="font-bold" style={{ color: msg.userColor || '#ffffff' }}>
                      {msg.username}:
                    </span>

                    {/* Message text */}
                    <span className="text-neutral-200 break-words">{msg.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Sender Form */}
          <form onSubmit={handleSendChat} className="pt-3 border-t border-neutral-800 shrink-0 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400 text-[11px]">Enviar a:</span>
              <button
                type="button"
                onClick={() => setChatTarget('both')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${chatTarget === 'both' ? 'bg-neutral-200 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Ambos
              </button>
              <button
                type="button"
                onClick={() => setChatTarget('twitch')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${chatTarget === 'twitch' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Twitch
              </button>
              <button
                type="button"
                onClick={() => setChatTarget('kick')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${chatTarget === 'kick' ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Kick
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe como streamer en el chat..."
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="p-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg transition-colors font-bold"
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>

      </div>

    </div>
  );
};
