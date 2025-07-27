// server/index.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import process from 'process';
import path from 'path';
import { startWebSocketServer, broadcast } from '../services/webSocketServer.js';
import { startControlLoop, controllerStatus } from '../controlLoop.js';
import statusRoutes from './routes/statusRoutes.js';
import ventRoutes from './routes/ventRoutes.js';
import logger from '../services/logger.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import mqttAgent from '../services/mqttAgent.js';
import cfg from '../services/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// const PORT = process.env.PORT || 3001;
// const PORT = process.env.PORT || 8081;
const PORT = process.env.PORT || 5678;

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Enable CORS for all routes
app.use(express.static(path.resolve(__dirname, '../public')));
const server = http.createServer(app);

startWebSocketServer(server);

 
app.use('/api', statusRoutes);
app.use('/api', ventRoutes);

app.get('/api', (req, res) => {
  res.json({ message: "This is the API" });
});

server.listen(PORT, () => {
  // console.log(`Server listening on ${PORT}`);
  logger.info("Server listening on: " + PORT);
});

startControlLoop(broadcast);