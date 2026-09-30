/**
 * Dynamically resolves API and WebSocket URLs based on current host (LAN IP or domain)
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    return `${protocol}//${window.location.hostname}:4000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function getWsUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:4000`;
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
}
