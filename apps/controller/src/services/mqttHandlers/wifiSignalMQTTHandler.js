import handleMessage from './genericHandler.js';
import { stateManager } from '../../controlLoop.js';
import logger from '../logger.js';

function setWifiSignalPercent(topic, value) {
  if (value === null || value === undefined || value === '') {
    logger.error('MQTT->WiFiSignal: NULL OR EMPTY PAYLOAD RECEIVED');
    return;
  }

  const numericValue = parseFloat(value);
  if (Number.isNaN(numericValue)) {
    logger.error(`MQTT->WiFiSignal: Non-numeric payload received: ${value}`);
    return;
  }

  const clampedValue = Math.max(0, Math.min(100, numericValue));
  stateManager.update({ wifiSignalPercent: clampedValue });
}

export default (topic, payload) => handleMessage(topic, payload, setWifiSignalPercent);
