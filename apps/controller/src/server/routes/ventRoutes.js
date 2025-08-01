import express from 'express';
import { stateManager } from '../../controlLoop.js';
import mqttAgent from '../../services/mqttAgent.js';
import cfg from '../../services/config.js';

const router = express.Router();

router.post('/vent/onDurationSecs', (req, res) => {
  const { value, period } = req.body; // period will be 'day' or 'night'
  const configKey = `vent.onDurationMs.${period}`;
  const statusKey = `ventOnDuration${period === 'day' ? 'Day' : 'Night'}Secs`;
  const topic = cfg.getWithMQTTPrefix(`mqtt.${statusKey}Topic`);

  mqttAgent.client.publish(topic, value.toString());
  cfg.set(configKey, value * 1000);
  stateManager.update({ [statusKey]: value });

  res.status(200).send({ message: 'OK' });
});

router.get('/vent/onDurationSecs', (req, res) => {
  const currentState = stateManager.getState();
  res.json({
    day: currentState.ventOnDurationDaySecs,
    night: currentState.ventOnDurationNightSecs,
  });
});

router.post('/vent/offDurationSecs', (req, res) => {
  const { value, period } = req.body; // period will be 'day' or 'night'
  const configKey = `vent.offDurationMs.${period}`;
  const statusKey = `ventOffDuration${period === 'day' ? 'Day' : 'Night'}Secs`;
  const topic = cfg.getWithMQTTPrefix(`mqtt.${statusKey}Topic`);

  mqttAgent.client.publish(topic, value.toString());
  cfg.set(configKey, value * 1000);
  stateManager.update({ [statusKey]: value });

  res.status(200).send({ message: 'OK' });
});

router.get('/vent/offDurationSecs', (req, res) => {
  const currentState = stateManager.getState();
  res.json({
    day: currentState.ventOffDurationDaySecs,
    night: currentState.ventOffDurationNightSecs,
  });
});

export default router;
