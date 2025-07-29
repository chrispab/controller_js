import express from 'express';
import { updateAndBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import mqttAgent from '../../services/mqttAgent.js';
import cfg from '../../services/config.js';
import { controllerStatus } from '../../controlLoop.js';

const router = express.Router();

//set setting
router.post('/setpoint/highSetpoint', (req, res) => {
  const { value } = req.body;
  console.log(`Received high setpoint value: ${value}`);
  const topic = cfg.getWithMQTTPrefix(`mqtt.highSetpointTopic`);
  mqttAgent.client.publish(topic, value.toString());
  updateAndBroadcastStatusIfValueChanged('highSetpoint', value);
  cfg.set('zone.highSetpoint', value);
  res.status(200).send({ message: 'OK' });
});

router.post('/setpoint/lowSetpoint', (req, res) => {
  const { value } = req.body;
  console.log(`Received low setpoint value: ${value}`);
  const topic = cfg.getWithMQTTPrefix(`mqtt.lowSetpointTopic`);
  mqttAgent.client.publish(topic, value.toString());
  updateAndBroadcastStatusIfValueChanged('lowSetpoint', value);
  cfg.set('zone.lowSetpoint', value);
  res.status(200).send({ message: 'OK' });
});

router.get('/setpoint/highSetpoint', (req, res) => {
  console.log('.................../setpoint/highSetpoint:', JSON.stringify(controllerStatus));

  // res.json({
  //   day: controllerStatus.ventOnDurationDaySecs,
  //   night: controllerStatus.ventOnDurationNightSecs,
  // });
  res.json({ message: controllerStatus.highSetpoint });
});

router.get('/setpoint/lowSetpoint', (req, res) => {
  console.log('.................../setpoint/lowSetpoint:', JSON.stringify(controllerStatus));
  res.json({ message: controllerStatus.lowSetpoint });
});

router.get('/setpoint', (req, res) => {
  console.log('.................../setpoint:', JSON.stringify(controllerStatus));
  res.json({ message: controllerStatus.setpoint });
});

// router.post('/vent/offDurationSecs', (req, res) => {
//   const { value, period } = req.body; // period will be 'day' or 'night'
//   const topic = cfg.getWithMQTTPrefix(`mqtt.ventOffDuration${period === 'day' ? 'Day' : 'Night'}SecsTopic`);
//   mqttAgent.client.publish(topic, value.toString());

//   // Update controllerStatus and config based on period
//   if (period === 'day') {
//     updateAndBroadcastStatusIfValueChanged('ventOffDurationDaySecs', value);
//     cfg.set('vent.offDurationMs.day', value * 1000);
//   } else if (period === 'night') {
//     updateAndBroadcastStatusIfValueChanged('ventOffDurationNightSecs', value);
//     cfg.set('vent.offDurationMs.night', value * 1000);
//   }

//   res.status(200).send({ message: 'OK' });
// });

// router.get('/vent/offDurationSecs', (req, res) => {
//   res.json({
//     day: controllerStatus.ventOffDurationDaySecs,
//     night: controllerStatus.ventOffDurationNightSecs,
//   });
// });

export default router;
