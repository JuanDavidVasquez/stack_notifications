import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  deviceId?: string; // puedes agregar un UUID desde el frontend si quieres
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'smarttv' | 'wearable' | 'embedded' | 'console' | 'unknown';
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
}

/**
 * Parsea el User-Agent para extraer información del dispositivo
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = (result.device.type as DeviceInfo['deviceType']) || 'desktop';
  const os = result.os.name || 'Unknown OS';
  const osVersion = result.os.version || undefined;
  const browser = result.browser.name || 'Unknown Browser';
  const browserVersion = result.browser.version || undefined;

  let deviceName: string;

  if (result.device.vendor && result.device.model) {
    deviceName = `${result.device.vendor} ${result.device.model}`;
  } else {
    deviceName = `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device`;
  }

  return {
    deviceType,
    os,
    osVersion,
    browser,
    browserVersion,
    deviceName,
  };
}

/**
 * Genera un nombre descriptivo para mostrar en UI o auditoría
 */
export function generateDeviceDisplayName(deviceInfo: DeviceInfo): string {
  const parts: string[] = [];

  if (deviceInfo.browser) {
    parts.push(deviceInfo.browser);
    if (deviceInfo.browserVersion) {
      parts.push(deviceInfo.browserVersion);
    }
  }

  if (deviceInfo.os) {
    parts.push(`on ${deviceInfo.os}`);
    if (deviceInfo.osVersion) {
      parts.push(deviceInfo.osVersion);
    }
  }

  if (deviceInfo.deviceType && deviceInfo.deviceType !== 'desktop') {
    parts.push(`(${deviceInfo.deviceType})`);
  }

  return parts.join(' ') || 'Unknown Device';
}
