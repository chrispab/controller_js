import handleMessage from './genericHandler.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import logger from '../logger.js';

function createVentDurationHandler(configKey) {
  return function(topic, value) {
    const numericValue = Number(value);
    if (numericValue > 0) {
      updateStausAndWSBroadcastStatusIfValueChanged(configKey, numericValue);
    } else {
      logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${value}`);
    }
  };
}

export const handleVentOnDurationDaySecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationHandler('ventOnDurationDaySecs'), 'mqtt.ventOnDurationDaySecsTopic', 'ventOnDurationDaySecs');

export const handleVentOffDurationDaySecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationHandler('ventOffDurationDaySecs'), 'mqtt.ventOffDurationDaySecsTopic', 'ventOffDurationDaySecs');

export const handleVentOnDurationNightSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationHandler('ventOnDurationNightSecs'), 'mqtt.ventOnDurationNightSecsTopic', 'ventOnDurationNightSecs');

export const handleVentOffDurationNightSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationHandler('ventOffDurationNightSecs'), 'mqtt.ventOffDurationNightSecsTopic', 'ventOffDurationNightSecs');
