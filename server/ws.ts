import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WS Client connected');

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        
        if (msg.type === 'init') {
          ws.send(JSON.stringify({ type: 'init:ack' }));
          return;
        }

        if (msg.type === 'sensor:reading' || msg.type === 'sensor:event') {
          // Relay to all other clients (mostly dashboards)
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message.toString());
            }
          });
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    });

    ws.on('close', () => {
      console.log('WS Client disconnected');
    });
  });

  return wss;
}

export function broadcast(wss: WebSocketServer, type: string, data: any) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
