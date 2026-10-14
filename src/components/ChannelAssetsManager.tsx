import React, { useState } from 'react';
import {
  Camera, Upload, Sparkles, Check, RefreshCw,
  ExternalLink, Layers
} from 'lucide-react';
import { PlatformConfig } from '../types/stream';

interface ChannelAssetsManagerProps {
  kickConfig: PlatformConfig;
  twitchConfig: PlatformConfig;
  onUpdateAvatar: (avatarUrl: string, platform: 'kick' | 'twitch' | 'both') => void;
  onUpdateBanner: (bannerUrl: string, platform: 'kick' | 'twitch' | 'both') => void;
}

const PRESET_AVATARS = [
  { id: 'av_cyber', name: 'Streamer Pro Gamer', url: '/assets/images/streamer_avatar_creator_1791998920448.jpg' },
  { id: 'av_irl', name: 'Studio Headset Portrait', url: '/assets/images/thumbnail_irl_reaction_1791998919984.jpg' }
];

const PRESET_BANNERS = [
  { id: 'bn_official', name: 'Kick & Twitch Speedlines', url: '/assets/images/channel_stream_banner_1791998919824.jpg' },
  { id: 'bn_arena', name: 'Esports Championship Stadium', url: '/assets/images/thumbnail_gaming_action_1791998919003.jpg' }
];

export const ChannelAssetsManager: React.FC<ChannelAssetsManagerProps> = ({
  kickConfig,
  twitchConfig,
  onUpdateAvatar,
  onUpdateBanner,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(kickConfig.channelAvatar || '/assets/images/streamer_avatar_creator_1791998920448.jpg');
  const [selectedBanner, setSelectedBanner] = useState(kickConfig.channelBanner || '/assets/images/channel_stream_banner_1791998919824.jpg');
  const [avatarPrompt, setAvatarPrompt] = useState('Avatar ilustrado streamer futurista con luces neon y auriculares');
  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleApplyAvatar = (target: 'kick' | 'twitch' | 'both') => {
    onUpdateAvatar(selectedAvatar, target);
    setSuccessMessage(`¡Avatar actualizado correctamente en ${target === 'both' ? 'Kick y Twitch' : target.toUpperCase()}!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleApplyBanner = (target: 'kick' | 'twitch' | 'both') => {
    onUpdateBanner(selectedBanner, target);
    setSuccessMessage(`¡Banner de canal actualizado en ${target === 'both' ? 'Kick y Twitch' : target.toUpperCase()}!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'avatar') {
        setSelectedAvatar(dataUrl);
      } else {
        setSelectedBanner(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiAvatar = async () => {
    setIsGeneratingAiAvatar(true);
    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `High quality esports creator avatar portrait, 1:1 format, ${avatarPrompt}`,
          aspectRatio: '1:1'
        })
      });
      const data = await res.json();
      if (data && data.imageUrl) {
        setSelectedAvatar(data.imageUrl);
      }
    } catch (err) {
      console.error('Error generating AI avatar:', err);
    } finally {
      setIsGeneratingAiAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            <span>Gestor de Imagen de Marca, Fotos & Banners de Canal</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Cambia tu foto de perfil, avatar y pantalla offline de Twitch y Kick desde un solo lugar
          </p>
        </div>

        {successMessage && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Avatar Studio (Left) & Banner Studio (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Profile Picture / Avatar Studio */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Foto de Perfil & Avatar del Streamer</span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">1:1 Cuadrado (800x800)</span>
          </div>

          {/* Dual Live Preview: Kick vs Twitch Avatar Rings */}
          <div className="flex items-center justify-around p-4 bg-neutral-950 rounded-xl border border-neutral-800/80">
            {/* Twitch Preview */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-purple-600 to-purple-400 shadow-lg shadow-purple-600/30">
                  <img
                    src={selectedAvatar}
                    alt="Twitch Avatar Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full bg-neutral-900"
                  />
                </div>
                <div className="absolute bottom-1 right-1 bg-purple-600 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white uppercase">
                  LIVE
                </div>
              </div>
              <span className="text-xs font-bold text-neutral-200">En Twitch</span>
              <span className="text-[11px] text-purple-400 font-mono">@{twitchConfig.channelName}</span>
            </div>

            {/* Kick Preview */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-emerald-300 shadow-lg shadow-emerald-500/30">
                  <img
                    src={selectedAvatar}
                    alt="Kick Avatar Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full bg-neutral-900"
                  />
                </div>
                <div className="absolute bottom-1 right-1 bg-emerald-500 text-[10px] font-black px-1.5 py-0.5 rounded-full text-neutral-950 uppercase">
                  LIVE
                </div>
              </div>
              <span className="text-xs font-bold text-neutral-200">En Kick</span>
              <span className="text-[11px] text-emerald-400 font-mono">@{kickConfig.channelName}</span>
            </div>
          </div>

          {/* Preset Avatars */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-300 block">Galería de Avatares Disponibles:</span>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_AVATARS.map(av => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.url)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    selectedAvatar === av.url
                      ? 'bg-neutral-800 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <img
                    src={av.url}
                    alt={av.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{av.name}</div>
                    <span className="text-[10px] text-emerald-400 font-mono">Alta Calidad</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Avatar Generator with Gemini */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Generar Nuevo Avatar con IA (Gemini)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={avatarPrompt}
                onChange={(e) => setAvatarPrompt(e.target.value)}
                placeholder="Describe tu avatar ideal..."
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={handleGenerateAiAvatar}
                disabled={isGeneratingAiAvatar}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isGeneratingAiAvatar ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Generar</span>
              </button>
            </div>
          </div>

          {/* Upload Custom File */}
          <div>
            <label className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-700 hover:border-emerald-400 rounded-lg cursor-pointer bg-neutral-950 text-xs text-neutral-300 transition-colors">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Subir Foto Personal desde tu PC</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'avatar')}
                className="hidden"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleApplyAvatar('both')}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-emerald-950/40"
            >
              Actualizar en Kick & Twitch
            </button>
            <button
              onClick={() => handleApplyAvatar('kick')}
              className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-xs rounded-lg transition-colors"
            >
              Sólo Kick
            </button>
            <button
              onClick={() => handleApplyAvatar('twitch')}
              className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-purple-400 font-bold text-xs rounded-lg transition-colors"
            >
              Sólo Twitch
            </button>
          </div>
        </div>

        {/* CARD 2: Channel Header Banner & Offline Screen */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Banner de Cabecera & Pantalla Offline</span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">16:9 Panorámico (1920x1080)</span>
          </div>

          {/* Banner Live Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 shadow-xl bg-neutral-950">
            <img
              src={selectedBanner}
              alt="Channel Banner Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-white border border-neutral-700">
                  VISTA PREVIA DEL CANAL
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">● VINCULADO</span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={selectedAvatar}
                  alt="Avatar small"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover"
                />
                <div>
                  <div className="text-xs font-black text-white">{kickConfig.channelName}</div>
                  <div className="text-[10px] text-neutral-300">Transmitiendo en vivo para toda la comunidad</div>
                </div>
              </div>
            </div>
          </div>

          {/* Preset Banners */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-300 block">Banners Oficiales Diseñados:</span>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_BANNERS.map(bn => (
                <button
                  key={bn.id}
                  onClick={() => setSelectedBanner(bn.url)}
                  className={`relative aspect-video rounded-lg overflow-hidden border text-left transition-all group ${
                    selectedBanner === bn.url
                      ? 'border-purple-400 ring-2 ring-purple-400/40'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <img
                    src={bn.url}
                    alt={bn.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[10px] text-white font-semibold truncate">{bn.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Custom Banner */}
          <div>
            <label className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-700 hover:border-purple-400 rounded-lg cursor-pointer bg-neutral-950 text-xs text-neutral-300 transition-colors">
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Subir Banner Diseñado (1920x1080)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'banner')}
                className="hidden"
              />
            </label>
          </div>

          {/* Banner Apply Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleApplyBanner('both')}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-purple-950/40"
            >
              Publicar Banner en Ambas Plataformas
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
