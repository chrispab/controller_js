import express from 'express';
import { stateManager } from '../../controlLoop.js';

const router = express.Router();

router.get('/status', (req, res) => {
  const currentState = stateManager.getState();
  res.json({ message: currentState });
});

router.get('/soilMoisturePercent', (req, res) => {
  res.json({ message: stateManager.getState().soilMoisturePercent });
});

router.get(
  '/mqtt/soil1/sensor_method5_batch_moving_average_float',
  (req, res) => {
    res.json({ message: stateManager.getState().SensorSoilMoistureRaw });
  },
);

router.get('/mqtt/irrigationPump/status', (req, res) => {
  res.json({ message: stateManager.getState().irrigationPump });
});

router.get('/outside-temperature', (req, res) => {
  res.json({ message: stateManager.getState().outsideTemperature });
});

export default router;
