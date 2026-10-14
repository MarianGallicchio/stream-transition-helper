export interface RealSystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  cpuModel: string;
  cpuCores: number;
  totalMemBytes: number;
  freeMemBytes: number;
  uptimeSeconds: number;
  network: Array<{ name: string; address: string; family: string }>;
  geminiConfigured: boolean;
}

export interface RealHardwareInfo {
  cpuCores: number;
  deviceMemoryGB?: number;
  platform: string;
  userAgent: string;
  screen: string;
  gpu: string;
}

export async function fetchRealSystemInfo(): Promise<RealSystemInfo | null> {
  try {
    const res = await fetch('/api/system/info');
    if (!res.ok) return null;
    return (await res.json()) as RealSystemInfo;
  } catch {
    return null;
  }
}

export function getRealHardwareInfo(): RealHardwareInfo {
  const nav = navigator as any;
  let gpu = 'no detectada';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpu = String((gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL));
      } else {
        gpu = 'WebGL disponible (renderer oculto por navegador)';
      }
    }
  } catch {}
  return {
    cpuCores: nav.hardwareConcurrency || 0,
    deviceMemoryGB: nav.deviceMemory,
    platform: nav.platform || navigator.userAgent,
    userAgent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x`,
    gpu,
  };
}

export interface RealMediaDevice {
  kind: string;
  label: string;
  deviceId: string;
}

export async function getRealMediaDevices(): Promise<{ audioInputs: RealMediaDevice[]; videoInputs: RealMediaDevice[]; audioOutputs: RealMediaDevice[]; permission: string }> {
  const empty = { audioInputs: [] as RealMediaDevice[], videoInputs: [] as RealMediaDevice[], audioOutputs: [] as RealMediaDevice[], permission: 'unknown' };
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return empty;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const map = (d: MediaDeviceInfo): RealMediaDevice => ({ kind: d.kind, label: d.label || '(sin etiqueta: permite acceso para ver nombre)', deviceId: d.deviceId });
    return {
      audioInputs: devices.filter(d => d.kind === 'audioinput').map(map),
      videoInputs: devices.filter(d => d.kind === 'videoinput').map(map),
      audioOutputs: devices.filter(d => d.kind === 'audiooutput').map(map),
      permission: devices.some(d => d.label) ? 'granted' : 'prompt',
    };
  } catch {
    return empty;
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}
