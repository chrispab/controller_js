import { WebSocketServer } from 'ws';
import logger from './logger.js';
// import { version } from 'react';
import { getVersionInfo } from '../utils/utils.js';

let wss;

function startWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    logger.info(`Client connected to WebSocket. Total clients: ${wss.clients.size}`);
    ws.on('close', () => {
      logger.info(`Client disconnected from WebSocket. Total clients: ${wss.clients.size}`);
    });
    ws.on('error', (error) => logger.error('WebSocket error:', error));

    // Mark this client as needing initial data
    ws.needsInitialData = true;
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
  // logger.warn('web socket broadcast: ' + jsonData + '');
  if (wss.clients.size === 0) {
    // No clients connected, no need to log broadcast or continue
    return;
  }

  logger.warn(`${wss.clients.size} clients to web socket broadcast to: ` + jsonData + `''`);

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      // remove quotes before sending
      // let formattedData = jsonData.replace(/"/g, '');
      // formattedData = jsonData;

      if (client.needsInitialData) {
        // Send initial data and clear the flag
        let versionInfo = getVersionInfo();
        client.send('Version : ' + versionInfo.version);
        client.send('Release Notes : ' + versionInfo.releaseNotes);

        client.send('Time ---- [Te]--[Hu]--L-H-F-V-S-VT');

        client.needsInitialData = false;
        logger.warn('Sent initial data to client.');
      }

      client.send(jsonData);
    }
  });
}

export { startWebSocketServer, broadcast };
