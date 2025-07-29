import express from 'express';
import { updateAndBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import mqttAgent from '../../services/mqttAgent.js';
import cfg from '../../services/config.js';
import { controllerStatus } from '../../controlLoop.js';

const router = express.Router();

//set setting
router.post('/setpoint/highSetpoint', (req, res) => {
  const { value } = req.body;
  const topic = cfg.getWithMQTTPrefix(`mqtt.highSetpointTopic`);
  mqttAgent.client.publish(topic, value.toString());
  updateAndBroadcastStatusIfValueChanged('highSetpoint', value);
  cfg.set('zone.highSetpoint', value);
  
  // Update controllerStatus and config based on period
  // if (period === 'day') {
  //   updateAndBroadcastStatusIfValueChanged('ventOnDurationDaySecs', value);
  //   cfg.set('vent.onDurationMs.day', value * 1000);
  // } else if (period === 'night') {
  //   updateAndBroadcastStatusIfValueChanged('ventOnDurationNightSecs', value);
  //   cfg.set('vent.onDurationMs.night', value * 1000);
  // }

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
