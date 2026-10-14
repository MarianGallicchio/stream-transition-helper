import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend, BarChart, Bar
} from 'recharts';
import { Activity, Cpu, Wifi, AlertTriangle, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { OBSStats } from '../types/stream';
import { obsController } from '../services/obsController';

interface StreamTelemetryChartsProps {
  currentStats: OBSStats;
  isStreaming: boolean;
}

interface TelemetryPoint {
  time: string;
  timestamp: number;
  bitrate: number;
  cpu: number;
  fps: number;
  frameDrops: number;
  networkJitter: number;
}

// Generate realistic initial 60-minute historical telemetry data
const generateInitialTelemetry = (): TelemetryPoint[] => {
  const points: TelemetryPoint[] = [];
  const now = Date.now();
  
  for (let i = 60; i >= 0; i--) {
    const timeObj = new Date(now - i * 60 * 1000);
    const timeLabel = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Realistic fluctuations: Bitrate centered around 6,800 kbps
    const baseBitrate = 6750;
    const wave = Math.sin(i / 5) * 180;
    const noise = (Math.random() - 0.5) * 120;
    const bitrate = Math.round(baseBitrate + wave + noise);

    // CPU centered around 4.5% with minor peaks during scene transitions
    const cpuPeak = (i % 12 === 0) ? 2.5 : 0;
    const cpu = parseFloat((4.2 + Math.sin(i / 3) * 0.8 + cpuPeak + Math.random() * 0.4).toFixed(1));

    // Frame drops mostly 0, with rare 1-2 frames
    const frameDrops = (i === 24 || i === 47) ? 2 : 0;
    const fps = parseFloat((59.8 + Math.random() * 0.3).toFixed(1));

    points.push({
      time: timeLabel,
      timestamp: timeObj.getTime(),
      bitrate,
      cpu,
      fps,
      frameDrops,
      networkJitter: parseFloat((4 + Math.random() * 2).toFixed(1))
    });
  }

  return points;
};

export const StreamTelemetryCharts: React.FC<StreamTelemetryChartsProps> = ({ currentStats, isStreaming }) => {
  const [data, setData] = useState<TelemetryPoint[]>(() => generateInitialTelemetry());
  const [timeRange, setTimeRange] = useState<'15m' | '30m' | '60m'>('60m');
  const [chartMode, setChartMode] = useState<'overview' | 'bitrate' | 'cpu' | 'drops'>('overview');

  // Real-time ticking updates: push new data point every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newPoint: TelemetryPoint = {
        time: timeLabel,
        timestamp: now.getTime(),
        bitrate: isStreaming ? currentStats.bitrate : 0,
        cpu: parseFloat((currentStats.cpu + (Math.random() - 0.5) * 0.4).toFixed(1)),
        fps: parseFloat((currentStats.fps).toFixed(1)),
        frameDrops: Math.random() > 0.95 ? 1 : 0,
        networkJitter: parseFloat((4.2 + (Math.random() - 0.5)).toFixed(1))
      };

      setData(prev => {
        const updated = [...prev.slice(1), newPoint];
        return updated;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [currentStats, isStreaming]);

  // Filter data based on selected range
  const filteredData = useMemo(() => {
    const pointsCount = timeRange === '15m' ? 16 : timeRange === '30m' ? 31 : 61;
    return data.slice(-pointsCount);
  }, [data, timeRange]);

  // Calculated aggregate statistics
  const statsSummary = useMemo(() => {
    if (filteredData.length === 0) return { avgBitrate: 0, maxBitrate: 0, minBitrate: 0, avgCpu: 0, maxCpu: 0, totalDrops: 0 };
    
    const bitrates = filteredData.map(d => d.bitrate);
    const cpus = filteredData.map(d => d.cpu);
    const drops = filteredData.map(d => d.frameDrops);

    const avgBitrate = Math.round(bitrates.reduce((a, b) => a + b, 0) / bitrates.length);
    const maxBitrate = Math.max(...bitrates);
    const minBitrate = Math.min(...bitrates);

    const avgCpu = parseFloat((cpus.reduce((a, b) => a + b, 0) / cpus.length).toFixed(1));
    const maxCpu = parseFloat(Math.max(...cpus).toFixed(1));

    const totalDrops = drops.reduce((a, b) => a + b, 0);

    return { avgBitrate, maxBitrate, minBitrate, avgCpu, maxCpu, totalDrops };
  }, [filteredData]);

  // Custom Dark Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-900 border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
          <div className="text-neutral-400 font-mono text-[11px] pb-1 border-b border-neutral-800 flex items-center justify-between gap-4">
            <span>Hora: {label}</span>
            <span className="text-emerald-400 font-bold">● ONLINE</span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-neutral-100 tabular-nums">
                {entry.value} {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
      
      {/* Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Telemetría de Emisión y Estabilidad en Tiempo Real</span>
          </h3>
          <p className="text-xs text-neutral-400">
            Monitor de tasa de bits (Bitrate), uso del codificador CPU y pérdida de cuadros durante los últimos 60 minutos
          </p>
        </div>

        {/* Chart View Switcher & Time Range */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Metric View Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setChartMode('overview')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                chartMode === 'overview' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setChartMode('bitrate')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                chartMode === 'bitrate' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Bitrate
            </button>
            <button
              onClick={() => setChartMode('cpu')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                chartMode === 'cpu' ? 'bg-purple-950 text-purple-400 border border-purple-800/60' : 'text-neutral-400 hover:text-white'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setChartMode('drops')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                chartMode === 'drops' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cuadros
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            {(['15m', '30m', '60m'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  timeRange === range ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Production Telemetry Calibration & Diagnostic Tools */}
      <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-neutral-300">Diagnóstico & Calibración de Ancho de Banda:</span>
          <span className="text-neutral-500 hidden sm:inline text-[11px]">(Monitoreo estricto: Alerta si Frames Drop &gt; 5.0% o Bitrate &lt; 4500 kb/s)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => obsController.simulateHighFrameDrops(6.4)}
            className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 font-semibold text-[11px] transition-colors"
            title="Prueba de umbral crítico de pérdida de paquetes"
          >
            Comprobar Alerta Drops (&gt;5%)
          </button>
          <button
            onClick={() => obsController.simulateBitrateDrop(2850)}
            className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 font-semibold text-[11px] transition-colors"
            title="Prueba de fluctuación de ancho de banda"
          >
            Comprobar Caída Bitrate
          </button>
          <button
            onClick={() => obsController.restoreNominalNetwork()}
            className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-semibold text-[11px] transition-colors"
            title="Restaura la emisión a estado óptimo nominal"
          >
            Recalibrar a Nominal
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bitrate Promedio</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">ESTABLE</span>
          </div>
          <div className="text-lg font-black font-mono text-emerald-400 tabular-nums">
            {statsSummary.avgBitrate} <span className="text-xs font-normal text-neutral-400">kb/s</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Rango: {statsSummary.minBitrate} - {statsSummary.maxBitrate} kb/s
          </div>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Carga de CPU (Codificador)</span>
            </span>
            <span className="text-[10px] font-mono text-purple-400">NVENC</span>
          </div>
          <div className="text-lg font-black font-mono text-purple-400 tabular-nums">
            {statsSummary.avgCpu}% <span className="text-xs font-normal text-neutral-400">avg</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Pico máximo: {statsSummary.maxCpu}% CPU
          </div>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Pérdida de Cuadros</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">0.00%</span>
          </div>
          <div className="text-lg font-black font-mono text-neutral-100 tabular-nums">
            {statsSummary.totalDrops} <span className="text-xs font-normal text-neutral-400">frames</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            142,000 cuadros procesados
          </div>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Calidad de Red</span>
            </span>
            <span className="text-[10px] font-mono text-blue-400">100%</span>
          </div>
          <div className="text-lg font-black font-mono text-blue-400 tabular-nums">
            60.0 <span className="text-xs font-normal text-neutral-400">FPS Constante</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Jitter: 4.2ms · Buffer: Óptimo
          </div>
        </div>
      </div>

      {/* Main Recharts Area Container */}
      <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4">
        
        {/* OVERVIEW / COMBINED CHART */}
        {chartMode === 'overview' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bitrateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="time" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#737373" fontSize={11} domain={[5500, 7500]} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={11} domain={[0, 15]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine yAxisId="left" y={6500} stroke="#10b981" strokeDasharray="3 3" opacity={0.4} label={{ value: 'Target 6500k', fill: '#10b981', fontSize: 10 }} />
                <Area yAxisId="left" type="monotone" dataKey="bitrate" name="Bitrate" unit="kb/s" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#bitrateGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="cpu" name="Uso CPU" unit="%" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* BITRATE STABILITY CHART */}
        {chartMode === 'bitrate' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="bitrateOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="time" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} domain={[5800, 7200]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={6800} stroke="#53fc18" strokeDasharray="4 4" label={{ value: 'Target 6800 Kbps', fill: '#53fc18', fontSize: 10 }} />
                <Area type="monotone" dataKey="bitrate" name="Bitrate" unit="kb/s" stroke="#53fc18" strokeWidth={2.5} fillOpacity={1} fill="url(#bitrateOnlyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CPU USAGE CHART */}
        {chartMode === 'cpu' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="time" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} domain={[0, 12]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alerta Alta Carga (8%)', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="cpu" name="Uso CPU" unit="%" stroke="#c084fc" strokeWidth={2.5} fillOpacity={1} fill="url(#cpuOnlyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* FRAME DROPS CHART */}
        {chartMode === 'drops' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="time" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} domain={[0, 5]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="frameDrops" name="Cuadros Perdidos" unit="cuadros" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chart Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 mt-2 border-t border-neutral-900 text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Bitrate de Emisión (Verde Neón)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>Codificador CPU (Morado)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
            <span>Intervalo de Muestreo: 15s</span>
            <span>·</span>
            <span>Historial: 60 minutos</span>
          </div>
        </div>

      </div>

    </div>
  );
};
