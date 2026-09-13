import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { router } from './routes';
import { setupWebSocket } from './ws';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

const server = createServer(app);
const wss = setupWebSocket(server);
app.locals.wss = wss;

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  console.log(`WebSocket server listening on ws://localhost:${PORT}/ws`);
});
