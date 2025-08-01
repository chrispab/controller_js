import handleMessage from './genericHandler.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import logger from '../logger.js';

function createFanDurationHandler(configKey) {
  return function(topic, value) {
    const numericValue = Number(value);
    if (numericValue > 0) {
      updateStausAndWSBroadcastStatusIfValueChanged(configKey, numericValue);
    } else {
      logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${value}`);
    }
  };
}

export const handleFanOnDurationSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createFanDurationHandler('fanOnDurationSecs'), 'mqtt.fanOnDurationSecsTopic', 'fanOnDurationSecs');

export const handleFanOffDurationSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createFanDurationHandler('fanOffDurationSecs'), 'mqtt.fanOffDurationSecsTopic', 'fanOffDurationSecs');
