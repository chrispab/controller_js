import express from 'express';
import { stateManager } from '../../controlLoop.js';
import mqttAgent from '../../services/mqttAgent.js';
import cfg from '../../services/config.js';
import logger from '../../services/logger.js';

const router = express.Router();

//set on
router.post('/fan/onDurationSecs', (req, res) => {
  const { value } = req.body;
  // console.log(`Received /fan/onDurationSecs value: ${value}`);
  logger.warn(`api Received /fan/onDurationSecs set value: ${value}`);

  const topic = cfg.getWithMQTTPrefix(`mqtt.fanOnDurationSecsTopic`);
  mqttAgent.client.publish(topic, value.toString());

  const configKey = `fan.onDurationMs`;
  const statusKey = `fanOnDurationSecs`;
  cfg.set(configKey, value * 1000);
  stateManager.update({ [statusKey]: value });

  res.status(200).send({ message: 'OK' });
});

// get on
router.get('/fan/onDurationSecs', (req, res) => {
  const currentState = stateManager.getState();
  res.json({
    message: currentState.fanOnDurationSecs,
  });
});

//set off
router.post('/fan/offDurationSecs', (req, res) => {
  const { value } = req.body;
  logger.warn(`api Received /fan/offDurationSecs set value: ${value}`);

  const configKey = `fan.offDurationMs`;
  const statusKey = `fanOffDurationSecs`;

  const topic = cfg.getWithMQTTPrefix(`mqtt.${statusKey}Topic`);
  mqttAgent.client.publish(topic, value.toString());

  cfg.set(configKey, value * 1000);
  stateManager.update({ [statusKey]: value });

  res.status(200).send({ message: 'OK' });
});
//get off
router.get('/fan/offDurationSecs', (req, res) => {
  const currentState = stateManager.getState();
  res.json({
    message: currentState.fanOffDurationSecs,
  });
});

export default router;
