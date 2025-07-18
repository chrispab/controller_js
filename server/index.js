// server/index.js
import express from 'express';
import http from 'http';
import process from 'process';
import path from 'path';
import { startWebSocketServer, broadcast } from './webSocketServer.js';
import { startControlLoop, lastStatus } from '../src/controlLoop.js';
import logger from '../src/services/logger.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import mqttAgent from '../src/services/mqttAgent.js';
import cfg from '../src/services/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// const PORT = process.env.PORT || 3001;
// const PORT = process.env.PORT || 8081;
const PORT = process.env.PORT || 5678;

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.static('client/build'));
const server = http.createServer(app);

startWebSocketServer(server);

app.get('/api/status', (req, res) => {
  res.json({ message: lastStatus });
});

app.post('/api/ventOnDeltaSecs', (req, res) => {
  const { value } = req.body;
  const topic = cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsSetTopic');
  mqttAgent.publish(topic, value.toString());
  res.status(200).send({ message: 'OK' });
});

app.get('/api', (req, res) => {
  res.json({ message: "This is the API" });
});

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

server.listen(PORT, () => {
  // console.log(`Server listening on ${PORT}`);
  logger.info("Server listening on: " + PORT);
});

startControlLoop(broadcast);