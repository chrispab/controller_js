// server/index.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import process from 'process';
import path from 'path';
import {
  startWebSocketServer,
  broadcast,
} from '../services/webSocketServer.js';
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
  res.json({ message: 'This is the API' });
});

server.listen(PORT, () => {
  logger.info('Server listening on: ' + PORT);
});

// Centralized error handling middleware for Express
app.use((err, req, res, next) => {
  logger.error(`Unhandled Express Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
  });
  res.status(500).send('Something broke!');
});

// Catch unhandled exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  // It's crucial to exit the process after an uncaught exception
  // to prevent the application from running in an undefined state.
  process.exit(1);
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    `Unhandled Rejection at: ${promise}, reason: ${reason.message || reason}`,
    { stack: reason.stack || 'No stack trace available' },
  );
  // Depending on the application, you might want to exit here as well,
  // but it's often better to let the process continue if the rejection
  // is not critical and can be handled gracefully.
});

startControlLoop(broadcast);
