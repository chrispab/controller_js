// server/index.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import process from 'process';
import path from 'path';
import { startWebSocketServer, broadcast } from '../src/services/webSocketServer.js';
import { startControlLoop, controllerStatus } from '../src/controlLoop.js';
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
app.use(cors()); // Enable CORS for all routes
app.use(express.static(path.resolve(__dirname, '../public')));
const server = http.createServer(app);

startWebSocketServer(server);

app.get('/api/status', (req, res) => {
  res.json({ message: controllerStatus });
});

app.post('/api/vent/onDurationSecs', (req, res) => {
  const { value, period } = req.body; // period will be 'day' or 'night'
  const topic = cfg.getWithMQTTPrefix(`mqtt.ventOnDuration${period === 'day' ? 'Day' : 'Night'}SecsTopic`);
  mqttAgent.client.publish(topic, value.toString());

  // Update controllerStatus and config based on period
  if (period === 'day') {
    controllerStatus.ventOnDurationDaySecs = value;
    cfg.set('vent.onDurationMs.day', value * 1000);
  } else if (period === 'night') {
    controllerStatus.ventOnDurationNightSecs = value;
    cfg.set('vent.onDurationMs.night', value * 1000);
  }

  broadcast(controllerStatus);
  res.status(200).send({ message: 'OK' });
});

app.get('/api/vent/onDurationSecs', (req, res) => {
  res.json({
    day: controllerStatus.ventOnDurationDaySecs,
    night: controllerStatus.ventOnDurationNightSecs
  });
});

app.post('/api/vent/offDurationSecs', (req, res) => {
  const { value, period } = req.body; // period will be 'day' or 'night'
  const topic = cfg.getWithMQTTPrefix(`mqtt.ventOffDuration${period === 'day' ? 'Day' : 'Night'}SecsTopic`);
  mqttAgent.client.publish(topic, value.toString());

  // Update controllerStatus and config based on period
  if (period === 'day') {
    controllerStatus.ventOffDurationDaySecs = value;
    cfg.set('vent.offDurationMs.day', value * 1000);
  } else if (period === 'night') {
    controllerStatus.ventOffDurationNightSecs = value;
    cfg.set('vent.offDurationMs.night', value * 1000);
  }

  broadcast(controllerStatus);
  res.status(200).send({ message: 'OK' });
});

app.get('/api/vent/offDurationSecs', (req, res) => {
  res.json({
    day: controllerStatus.ventOffDurationDaySecs,
    night: controllerStatus.ventOffDurationNightSecs
  });
});

// app.get('/api/soilMoisture', (req, res) => {
//   res.json({ message: controllerStatus.soilMoisture });
// });
app.get('/api/soilMoisturePercent', (req, res) => {
  res.json({ message: controllerStatus.soilMoisturePercent });
});

app.get('/api/mqtt/soil1/sensor_method5_batch_moving_average_float', (req, res) => {
  res.json({ message: controllerStatus.SensorSoilMoistureRaw });
});

app.get('/api/mqtt/irrigationPump/status', (req, res) => {
  res.json({ message: controllerStatus.irrigationPump });
});


// app.get('/api/irrigationPump', (req, res) => {
//   res.json({ message: controllerStatus.irrigationPump });
// });

app.get('/api', (req, res) => {
  res.json({ message: "This is the API" });
});

server.listen(PORT, () => {
  // console.log(`Server listening on ${PORT}`);
  logger.info("Server listening on: " + PORT);
});

startControlLoop(broadcast);