import express from 'express';
import { controllerStatus } from '../../controlLoop.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ message: { ...controllerStatus, highSetpoint: controllerStatus.highSetpoint, lowSetpoint: controllerStatus.lowSetpoint } });
});

router.get('/soilMoisturePercent', (req, res) => {
  res.json({ message: controllerStatus.soilMoisturePercent });
});

router.get(
  '/mqtt/soil1/sensor_method5_batch_moving_average_float',
  (req, res) => {
    res.json({ message: controllerStatus.SensorSoilMoistureRaw });
  },
);

router.get('/mqtt/irrigationPump/status', (req, res) => {
  res.json({ message: controllerStatus.irrigationPump });
});

router.get('/outside-temperature', (req, res) => {
  res.json({ message: controllerStatus.outsideTemperature });
});

export default router;
