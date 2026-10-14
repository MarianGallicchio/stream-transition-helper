import React, { useState, useEffect } from 'react';
import {
  Server, Radio, CheckCircle2, Shield, Eye, EyeOff,
  Copy, Download, ExternalLink, RefreshCw, Cpu, Mic,
  HardDrive, AlertCircle, Sparkles, Check
} from 'lucide-react';
import { PlatformConfig } from '../types/stream';
import { obsController } from '../services/obsController';
import { fetchRealSystemInfo, getRealHardwareInfo, getRealMediaDevices, formatBytes, RealSystemInfo, RealHardwareInfo } from '../services/systemInfo';

interface StreamAnchorSetupProps {
  kickConfig: PlatformConfig;
  twitchConfig: PlatformConfig;
  onUpdateKick: (config: Partial<PlatformConfig>) => void;
  onUpdateTwitch: (config: Partial<PlatformConfig>) => void;
  isObsConnected: boolean;
}

const TWITCH_INGEST_SERVERS = [
  { name: 'Automático (Recomendado)', url: 'rtmp://live.twitch.tv/app/', ping: 14 },
  { name: 'Sudamérica (Sao Paulo - sao01)', url: 'rtmp://sao01.contribute.live-video.net/app/', ping: 22 },
  { name: 'US East (Virginia - iad05)', url: 'rtmp://iad05.contribute.live-video.net/app/', ping: 48 },
  { name: 'US West (San Jose - sjc01)', url: 'rtmp://sjc01.contribute.live-video.net/app/', ping: 65 },
  { name: 'Europa (Madrid - mad01)', url: 'rtmp://mad01.contribute.live-video.net/app/', ping: 78 }
];

const KICK_INGEST_SERVERS = [
  { name: 'Kick Global Ingest (AWS IVS)', url: 'rtmp://fa723794b6f2.global-contribute.live-video.net/app/', ping: 19 },
  { name: 'Kick Direct Primary', url: 'rtmp://live.kick.com/app/', ping: 24 }
];

export const StreamAnchorSetup: React.FC<StreamAnchorSetupProps> = ({
  kickConfig,
  twitchConfig,
  onUpdateKick,
  onUpdateTwitch,
  isObsConnected
}) => {
  // OBS Configuration Anchor state (sin valores falsos)
  const [obsHost, setObsHost] = useState('localhost');
  const [obsPort, setObsPort] = useState('4455');
  const [obsPassword, setObsPassword] = useState('');
  const [isTestingObs, setIsTestingObs] = useState(false);
  const [obsTestResult, setObsTestResult] = useState<string | null>(null);

  // Twitch / Kick reales (vacío hasta que pegues tu clave real)
  const [twitchServer, setTwitchServer] = useState(TWITCH_INGEST_SERVERS[0].url);
  const [twitchKey, setTwitchKey] = useState(twitchConfig.streamKey || '');
  const [showTwitchKey, setShowTwitchKey] = useState(false);

  const [kickServer, setKickServer] = useState(KICK_INGEST_SERVERS[0].url);
  const [kickKey, setKickKey] = useState(kickConfig.streamKey || '');
  const [showKickKey, setShowKickKey] = useState(false);

  // PC real de este equipo
  const [sysInfo, setSysInfo] = useState<RealSystemInfo | null>(null);
  const [hwInfo, setHwInfo] = useState<RealHardwareInfo | null>(null);
  const [media, setMedia] = useState<{ audioInputs: Array<{ label: string }>; videoInputs: Array<{ label: string }>; audioOutputs: Array<{ label: string }> }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });

  // Notice & Feedback state
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchRealSystemInfo().then(setSysInfo);
    try { setHwInfo(getRealHardwareInfo()); } catch {}
    getRealMediaDevices().then(setMedia);
    try {
      const saved = localStorage.getItem('streamhub_obs_anchor');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.obsHost) setObsHost(p.obsHost);
        if (p.obsPort) setObsPort(String(p.obsPort));
      }
    } catch {}
  }, []);

  // Detecta dispositivos reales y crea canales de audio reales en el mezclador
  const handleDetectRealDevices = async () => {
    try {
      // Pide permiso para ver etiquetas reales
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
      const real = await getRealMediaDevices();
      setMedia(real);
      const channels = real.audioInputs.map((d, i) => ({
        id: `real_mic_${i}`,
        name: d.label || `Micrófono real ${i + 1}`,
        type: 'mic' as const,
        volume: 0.8,
        volumeDb: -3.9,
        muted: false,
        peak: 0
      }));
      if (channels.length > 0) {
        obsController.setRealAudioChannels(channels);
        setSaveNotice(`Detectados ${channels.length} micrófono(s) reales en tu PC.`);
      } else {
        setSaveNotice('No se detectaron micrófonos. Conecta uno y permite acceso en el navegador.');
      }
      setTimeout(() => setSaveNotice(null), 3500);
    } catch {
      setSaveNotice('No se pudo enumerar dispositivos.');
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  // Detect and verify connection (real, sin marcar éxito falso)
  const handleTestAndAnchorObs = async () => {
    setIsTestingObs(true);
    setObsTestResult(null);
    try {
      const probe = await fetch('/api/obs/probe-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: obsHost, port: parseInt(obsPort, 10) || 4455 })
      }).then(r => r.json());
      const success = await obsController.connect(obsHost, parseInt(obsPort, 10) || 4455, obsPassword);
      if (success && probe?.connected) {
        setObsTestResult('Conectado a OBS real.');
        setSaveNotice('¡OBS real anclado en ' + obsHost + ':' + obsPort + '!');
      } else {
        setObsTestResult(`No conecta: ${probe?.error || 'sin respuesta'}. ${probe?.tip || 'Activa WebSocket en OBS > Herramientas.'}`);
        setSaveNotice(null);
      }
    } catch (e: any) {
      setObsTestResult('Error probando OBS: ' + (e?.message || e));
    } finally {
      setIsTestingObs(false);
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  const handleSaveAllAnchors = () => {
    onUpdateTwitch({ streamKey: twitchKey });
    onUpdateKick({ streamKey: kickKey });
    try {
      localStorage.setItem('streamhub_obs_anchor', JSON.stringify({ obsHost, obsPort, obsPassword }));
      localStorage.setItem('streamhub_twitch_anchor', JSON.stringify({ twitchServer, twitchKey }));
      localStorage.setItem('streamhub_kick_anchor', JSON.stringify({ kickServer, kickKey }));
    } catch {
      // Ignore
    }
    setSaveNotice('¡Configuración de emisión y claves ancladas correctamente!');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleExportObsProfile = () => {
    const obsProfileData = {
      StreamHubVersion: '3.2.0',
      AnchorDate: new Date().toISOString(),
      OBSWebSocket: {
        Host: obsHost,
        Port: parseInt(obsPort, 10),
        Protocol: 'WebSocket v5.0.2',
        Auth: obsPassword ? 'SHA256 Encrypted' : 'None'
      },
      TwitchService: {
        Server: twitchServer,
        StreamKey: twitchKey,
        RecommendedBitrate: 6500,
        KeyframeInterval: 2,
        Resolution: '1920x1080',
        FPS: 60
      },
      KickService: {
        Server: kickServer,
        StreamKey: kickKey,
        RecommendedBitrate: 7000,
        KeyframeInterval: 2,
        Resolution: '1920x1080',
        FPS: 60
      }
    };

    const blob = new Blob([JSON.stringify(obsProfileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OBS_StreamHub_Profile_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>Centro de Anclaje & Conexión Directa (OBS, Twitch y Kick)</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Vincula de forma precisa tu software OBS Studio con los servidores RTMP oficiales de Kick y Twitch para transmitir sin intermediarios
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveNotice && (
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fade-in mr-2">
              <Check className="w-4 h-4" />
              <span>{saveNotice}</span>
            </div>
          )}

          <button
            onClick={handleExportObsProfile}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-neutral-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Perfil OBS (.json)</span>
          </button>

          <button
            onClick={handleSaveAllAnchors}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-md shadow-emerald-950/40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Anclar y Guardar Todo</span>
          </button>
        </div>
      </div>

      {/* Main Grid: OBS Anchor (Left) & Twitch / Kick Ingest Anchors (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* OBS STUDIO DIRECT ANCHOR (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Anclaje de OBS Studio</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              OBS v5 PROTOCOL
            </span>
          </div>

          {/* Connection Status Card (real) */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isObsConnected ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                <span className="text-xs font-bold text-neutral-200">{isObsConnected ? 'OBS conectado (real)' : 'OBS no conectado'}</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 font-bold">{obsHost}:{obsPort}</span>
            </div>

            <div className="text-xs text-neutral-400 leading-relaxed">
              {obsTestResult || 'Probá la conexión real. Sin WebSocket activo en OBS no hay control ni telemetría.'}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div className="bg-neutral-900 p-2 rounded border border-neutral-800/80">
                <span className="text-neutral-500 block">Tu PC (backend real)</span>
                <span className="text-neutral-200 font-semibold">{sysInfo ? `${sysInfo.cpuModel} · ${sysInfo.cpuCores} núcleos` : 'Leyendo...'}</span>
              </div>
              <div className="bg-neutral-900 p-2 rounded border border-neutral-800/80">
                <span className="text-neutral-500 block">RAM / GPU (navegador)</span>
                <span className="text-purple-400 font-semibold">{sysInfo ? `${formatBytes(sysInfo.totalMemBytes)} RAM` : '...'} · {hwInfo ? hwInfo.gpu.slice(0, 42) : 'GPU leyendo...'}</span>
              </div>
            </div>
          </div>

          {/* Form Settings */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Host del Servidor WebSocket</label>
              <input
                type="text"
                value={obsHost}
                onChange={(e) => setObsHost(e.target.value)}
                placeholder="localhost o 127.0.0.1"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Puerto de Escucha OBS (Default 4455)</label>
              <input
                type="number"
                value={obsPort}
                onChange={(e) => setObsPort(e.target.value)}
                placeholder="4455"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Contraseña de Autenticación (Opcional)</label>
              <input
                type="password"
                value={obsPassword}
                onChange={(e) => setObsPassword(e.target.value)}
                placeholder="Configurada en OBS > Servidor WebSocket"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              onClick={handleTestAndAnchorObs}
              disabled={isTestingObs}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-xs rounded-lg transition-colors border border-emerald-900/60 flex items-center justify-center gap-1.5"
            >
              {isTestingObs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isTestingObs ? 'Comprobando conexión...' : 'Verificar y Re-anclar OBS'}</span>
            </button>
          </div>

          {/* Real Device Detection */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 block">Tu PC en este momento (real):</span>
              <button onClick={handleDetectRealDevices} className="text-[11px] px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-900/50">
                Detectar micrófonos/cámaras
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              {media.audioInputs.length === 0 && media.videoInputs.length === 0 ? (
                <div className="p-2 rounded bg-neutral-950 border border-dashed border-neutral-700 text-neutral-400">
                  Sin dispositivos listados. Pulsa detectar y permite acceso al micrófono/cámara en el navegador.
                </div>
              ) : (
                <>
                  {media.audioInputs.map((d, i) => (
                    <div key={'a'+i} className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800">
                      <span className="flex items-center gap-2 text-neutral-300">
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{d.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">audioinput</span>
                    </div>
                  ))}
                  {media.videoInputs.map((d, i) => (
                    <div key={'v'+i} className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800">
                      <span className="flex items-center gap-2 text-neutral-300">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span>{d.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">videoinput</span>
                    </div>
                  ))}
                </>
              )}
              {sysInfo && (
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400">
                  {sysInfo.hostname} · {sysInfo.platform}/{sysInfo.arch} · RAM libre {formatBytes(sysInfo.freeMemBytes)} de {formatBytes(sysInfo.totalMemBytes)} · Red: {sysInfo.network.map(n => n.address).join(', ') || 'sin IPv4 pública'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TWITCH & KICK INGEST ANCHORS (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* TWITCH ANCHOR CARD */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-white font-black text-xs">
                  TW
                </div>
                <h3 className="font-bold text-white text-sm">Anclaje de Transmisión: Twitch</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  {twitchKey ? 'CLAVE CARGADA' : 'SIN CLAVE'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Servidor Ingest Oficial</label>
                <select
                  value={twitchServer}
                  onChange={(e) => {
                    setTwitchServer(e.target.value);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                >
                  {TWITCH_INGEST_SERVERS.map(srv => (
                    <option key={srv.url} value={srv.url}>
                      {srv.name} — {srv.url}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-300 font-medium">Clave de Transmisión (Stream Key)</label>
                  <button
                    type="button"
                    onClick={() => setShowTwitchKey(!showTwitchKey)}
                    className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {showTwitchKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showTwitchKey ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showTwitchKey ? 'text' : 'password'}
                    value={twitchKey}
                    onChange={(e) => setTwitchKey(e.target.value)}
                    placeholder="live_XXXXXXXXXXXXXX"
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => handleCopy(twitchKey, 'twitch_key')}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1 font-semibold text-xs"
                    title="Copiar Clave para OBS"
                  >
                    {copiedItem === 'twitch_key' ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedItem === 'twitch_key' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                <span>Canal enlazado: <strong className="text-white">twitch.tv/{twitchConfig.channelName}</strong></span>
                <a
                  href={`https://twitch.tv/${twitchConfig.channelName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Canal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* KICK ANCHOR CARD */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-neutral-950 font-black text-xs">
                  K
                </div>
                <h3 className="font-bold text-white text-sm">Anclaje de Transmisión: Kick</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {kickKey ? 'CLAVE CARGADA' : 'SIN CLAVE'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Servidor Ingest Oficial Kick</label>
                <select
                  value={kickServer}
                  onChange={(e) => {
                    setKickServer(e.target.value);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  {KICK_INGEST_SERVERS.map(srv => (
                    <option key={srv.url} value={srv.url}>
                      {srv.name} — {srv.url}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-300 font-medium">Clave de Transmisión Kick (Stream Key)</label>
                  <button
                    type="button"
                    onClick={() => setShowKickKey(!showKickKey)}
                    className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {showKickKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showKickKey ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showKickKey ? 'text' : 'password'}
                    value={kickKey}
                    onChange={(e) => setKickKey(e.target.value)}
                    placeholder="sk_live_XXXXXXXXXXXXXX"
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => handleCopy(kickKey, 'kick_key')}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1 font-semibold text-xs"
                    title="Copiar Clave para OBS"
                  >
                    {copiedItem === 'kick_key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedItem === 'kick_key' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                <span>Canal enlazado: <strong className="text-white">kick.com/{kickConfig.channelName}</strong></span>
                <a
                  href={`https://kick.com/${kickConfig.channelName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Canal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
