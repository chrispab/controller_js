import { WebSocketServer } from 'ws';
import logger from '../src/services/logger.js';

let wss;

function startWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    ws.on('error', console.error);
  });

  // console.log('WebSocket server is set up and running.');
  //use logger
  logger.info('WebSocket server is set up and running.');
}

function broadcast(data) {
  if (!wss) {
    return;
  }

  const jsonData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(jsonData);
    }
  });
}

export { startWebSocketServer, broadcast };
