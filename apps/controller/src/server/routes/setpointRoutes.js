import express from 'express';
import { stateManager } from '../../controlLoop.js';
import mqttAgent from '../../services/mqttAgent.js';
import cfg from '../../services/config.js';

const router = express.Router();

//set setting
router.post('/setpoint/highSetpoint', (req, res) => {
  const { value } = req.body;
  console.log(`Received high setpoint value: ${value}`);
  const topic = cfg.getWithMQTTPrefix(`mqtt.highSetpointTopic`);
  mqttAgent.client.publish(topic, value.toString());
  stateManager.update({ highSetpoint: value });
  cfg.set('zone.highSetpoint', value);
  res.status(200).send({ message: 'OK' });
});

router.post('/setpoint/lowSetpoint', (req, res) => {
  const { value } = req.body;
  console.log(`Received low setpoint value: ${value}`);
  const topic = cfg.getWithMQTTPrefix(`mqtt.lowSetpointTopic`);
  mqttAgent.client.publish(topic, value.toString());
  stateManager.update({ lowSetpoint: value });
  cfg.set('zone.lowSetpoint', value);
  res.status(200).send({ message: 'OK' });
});

router.get('/setpoint/highSetpoint', (req, res) => {
  const currentState = stateManager.getState();
  res.json({ message: currentState.highSetpoint });
});

router.get('/setpoint/lowSetpoint', (req, res) => {
  const currentState = stateManager.getState();
  res.json({ message: currentState.lowSetpoint });
});

router.get('/setpoint', (req, res) => {
  const currentState = stateManager.getState();
  res.json({ message: currentState.setpoint });
});

export default router;
