import { WebSocketServer } from 'ws';
import logger from './logger.js';
// import { version } from 'react';
// import { getPackageInfo } from '../utils/utils.js';

let wss;

/**
 * Initializes and starts the WebSocket server.
 * It attaches the WebSocket server to the provided HTTP server.
 * @param {http.Server} httpServer - The HTTP server instance to attach the WebSocket server to.
 */
function startWebSocketServer(httpServer) {
  try {
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
      logger.info(
        `Client connected to WebSocket. Total clients: ${wss.clients.size}`,
      );
      ws.on('close', () => {
        logger.info(
          `Client disconnected from WebSocket. Total clients: ${wss.clients.size}`,
        );
      });
      ws.on('error', (error) => {
        logger.error('WebSocket client error:', error);
      });

      // Mark this client as needing initial data
      ws.needsInitialData = true;
    });

    wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });

    logger.info('WebSocket server is set up and running.');
  } catch (error) {
    logger.error(`Failed to start WebSocket server: ${error.message}`, {
      stack: error.stack,
    });
  }
}

/**
 * Broadcasts data to all connected WebSocket clients.
 * The data is stringified to JSON before sending.
 * @param {Object} data - The data object to be broadcasted.
 */
function webSocketBroadcast(data) {
  if (!wss) {
    return;
  }

  let jsonData;
  try {
    jsonData = JSON.stringify(data);
  } catch (error) {
    logger.error(
      `Failed to stringify data for WebSocket broadcast: ${error.message}`,
      { stack: error.stack, data: data },
    );
    return; // Stop broadcast if data cannot be stringified
  }

  // logger.warn('web socket broadcast: ' + jsonData + '');
  if (wss.clients.size === 0) {
    // No clients connected, no need to log broadcast or continue
    return;
  }

  logger.warn(
    `webSocketBroadcast(data).....${wss.clients.size} clients to web socket broadcast to: ` +
      jsonData +
      `''`,
  );

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(jsonData);
      } catch (error) {
        logger.error(
          `Failed to send data to WebSocket client: ${error.message}`,
          { stack: error.stack, client: client.url },
        );
      }
    }
  });
}

export { startWebSocketServer, webSocketBroadcast };
