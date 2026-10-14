import React from 'react';
import { Radio, Square, Sparkles, SlidersHorizontal, Image as ImageIcon, Grid, Video, Server, Smile, Flame } from 'lucide-react';

interface NavbarProps {
  activeTab: 'obs' | 'highlights' | 'cam' | 'anchor' | 'stream' | 'thumbnails' | 'channel' | 'macros';
  setActiveTab: (tab: 'obs' | 'highlights' | 'cam' | 'anchor' | 'stream' | 'thumbnails' | 'channel' | 'macros') => void;
  isStreaming: boolean;
  onToggleStream: () => void;
  kickLive: boolean;
  twitchLive: boolean;
  isObsConnected: boolean;
  isVirtualObs: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isStreaming,
  onToggleStream,
  kickLive,
  twitchLive,
  isObsConnected,
  isVirtualObs,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        
        {/* Zone 1: Single Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 via-neutral-900 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <div className="w-full h-full bg-neutral-950 rounded-[7px] flex items-center justify-center">
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <span className="text-lg font-bold font-display tracking-tight text-white whitespace-nowrap shrink-0">
            StreamHub <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">Studio</span>
          </span>
          <span className="hidden xl:inline-block text-xs font-mono text-emerald-400 border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 rounded font-bold">
            OBS Studio v5 · Activo
          </span>
        </div>

        {/* Zone 2: Concise Nav Links */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('obs')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'obs'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>OBS Studio Deck</span>
          </button>

          <button
            onClick={() => setActiveTab('highlights')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'highlights'
                ? 'border-amber-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>Clips & Highlights</span>
          </button>

          <button
            onClick={() => setActiveTab('cam')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'cam'
                ? 'border-purple-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smile className="w-4 h-4 text-purple-400" />
            <span>Personaje & Facecam</span>
          </button>

          <button
            onClick={() => setActiveTab('anchor')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'anchor'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Anclaje OBS & Canales</span>
          </button>

          <button
            onClick={() => setActiveTab('stream')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'stream'
                ? 'border-purple-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Kick & Twitch Directos</span>
          </button>

          <button
            onClick={() => setActiveTab('thumbnails')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'thumbnails'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Miniaturas & Editor IA</span>
          </button>

          <button
            onClick={() => setActiveTab('channel')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'channel'
                ? 'border-purple-400 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Fotos & Banners de Canal</span>
          </button>

          <button
            onClick={() => setActiveTab('macros')}
            className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'macros'
                ? 'border-neutral-200 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Macros Stream Deck</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono mr-1">
            <span className={`flex items-center gap-1 ${twitchLive ? 'text-purple-400 font-bold' : 'text-neutral-400'}`}>
              Twitch {twitchLive ? '● ON' : 'OFF'}
            </span>
            <span className="text-neutral-700">|</span>
            <span className={`flex items-center gap-1 ${kickLive ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}>
              Kick {kickLive ? '● ON' : 'OFF'}
            </span>
          </div>

          <button
            onClick={onToggleStream}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md whitespace-nowrap shrink-0 ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black shadow-emerald-900/30'
            }`}
          >
            {isStreaming ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cortar Emisión</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Empezar Stream Dual</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Nav row for small screens */}
      <div className="md:hidden flex items-center justify-between gap-1 overflow-x-auto pt-3 border-t border-neutral-800/60 mt-3 text-xs">
        <button
          onClick={() => setActiveTab('obs')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'obs' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          OBS Studio
        </button>
        <button
          onClick={() => setActiveTab('highlights')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'highlights' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-400'}`}
        >
          🔥 Clips
        </button>
        <button
          onClick={() => setActiveTab('cam')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'cam' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          Personaje Cam
        </button>
        <button
          onClick={() => setActiveTab('anchor')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'anchor' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          Anclaje RTMP
        </button>
        <button
          onClick={() => setActiveTab('stream')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'stream' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          Transmisión
        </button>
        <button
          onClick={() => setActiveTab('thumbnails')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'thumbnails' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          Miniaturas IA
        </button>
        <button
          onClick={() => setActiveTab('channel')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'channel' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          Canal & Fotos
        </button>
        <button
          onClick={() => setActiveTab('macros')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${activeTab === 'macros' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
        >
          Macros
        </button>
      </div>
    </header>
  );
};
