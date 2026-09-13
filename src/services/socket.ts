// 🔌 BACKEND HOOK: Connect to real WebSocket server.
// See backend.md §3 for WebSocket protocol.

const WS_URL = import.meta.env.VITE_WS_URL || '';

export function connectToBackend(storeActions: any): () => void {
  if (!WS_URL) {
    console.info('[WS] No VITE_WS_URL configured, running in offline/mock mode');
    return () => {};
  }

  const ws = new WebSocket(`${WS_URL}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'init', clientType: 'dashboard' }));
    console.info('[WS] Connected to backend');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      
      switch (msg.type) {
        case 'report:new':
        case 'report:updated':
          // we can call a store action to reload or something, but we'll do loadInitialData
          storeActions.loadInitialData();
          break;
        case 'stats:updated':
          if (storeActions.setStats) storeActions.setStats(msg.data);
          break;
        case 'sensor:relayed':
        case 'sensor:reading':
          storeActions.setSensorReading(msg.data);
          break;
        case 'sensor:event':
          storeActions.setSensorEvent(msg.data);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('[WS] Error parsing message', err);
    }
  };

  ws.onclose = () => {
    console.warn('[WS] Disconnected. Reconnecting in 3s...');
    setTimeout(() => connectToBackend(storeActions), 3000);
  };

  return () => ws.close();
}
