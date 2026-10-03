/**
 * Dynamically resolves API and WebSocket URLs for both local development and cloud hosting (e.g. Render)
 */
export function getApiUrl(): string {
  // 1. If NEXT_PUBLIC_API_URL is configured for cloud deployment (e.g. Render), prioritize it
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. If running in browser locally (e.g., localhost or Wi-Fi LAN IP 192.168.x.x)
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.');

    if (isLocalhost) {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }

    // If hosted on a cloud domain (like *.onrender.com) and no variable was provided
    return `${window.location.protocol}//${window.location.host}`;
  }

  // 3. Fallback
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
}

export function getWsUrl(): string {
  // 1. If explicit NEXT_PUBLIC_WS_URL is provided, prioritize it
  if (process.env.NEXT_PUBLIC_WS_URL && !process.env.NEXT_PUBLIC_WS_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, '');
  }

  // 2. If API URL is an HTTPS domain (e.g. on Render), automatically map to secure WebSockets (wss://)
  const apiUrl = getApiUrl();
  if (apiUrl.startsWith('https://')) {
    return apiUrl.replace(/^https:\/\//, 'wss://');
  }
  if (apiUrl.startsWith('http://') && !apiUrl.includes('localhost') && !apiUrl.includes('192.168.') && !apiUrl.includes('127.0.0.1')) {
    return apiUrl.replace(/^http:\/\//, 'ws://');
  }

  // 3. Localhost and Wi-Fi LAN development fallback
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:4000`;
  }

  return 'ws://localhost:4000';
}
