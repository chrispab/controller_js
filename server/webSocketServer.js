import { WebSocketServer } from 'ws';
import logger from '../src/services/logger.js';
// import { version } from 'react';
import { getVersionInfo } from '../src/utils/utils.js';


let wss;

function startWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    ws.on('error', console.error);

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
  logger.warn('web socket broadcast: ' + jsonData + '');

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      // remove quotes before sending
      const formattedData = jsonData.replace(/"/g, '');

      if (client.needsInitialData) {
        // Send initial data and clear the flag
        let versionInfo = getVersionInfo();
        client.send('Version : ' + versionInfo.version);
        client.send('Release Notes : ' + versionInfo.releaseNotes);

        client.send('Time ---- [Te]--[Hu]--L-H-F-V-S-VT');
        
        client.needsInitialData = false;
        logger.error('Sent initial data to client.');
      } 

      client.send(formattedData);
    }
  });
}

export { startWebSocketServer, broadcast };
