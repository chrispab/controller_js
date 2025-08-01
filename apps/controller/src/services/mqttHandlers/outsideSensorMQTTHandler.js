import handleMessage from './genericHandler.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import logger from '../logger.js';
import cfg from '../config.js';

function setOutsideTemperature(topic, value) {
  if (!value || value.length === 0) {
    logger.error('MQTT->Outside_Sensor: NULL OR EMPTY PAYLOAD RECEIVED');
    return;
  }
  try {
    const obj = JSON.parse(value);
    const sensorName = cfg.get('mqtt.outsideSensorName') || 'DS18B20-1';
    const temperature = obj?.[sensorName]?.['Temperature'];

    if (typeof temperature !== 'undefined') {
      updateStausAndWSBroadcastStatusIfValueChanged('outsideTemperature', temperature);
    } else {
      logger.error(
        `MQTT->Outside_Sensor: Could not extract temperature from payload: ${value}`,
      );
    }
  } catch (e) {
    logger.error(
      `MQTT->Outside_Sensor: Failed to parse JSON payload: ${value}`,
      e,
    );
  }
}

export default (topic, payload) => handleMessage(topic, payload, setOutsideTemperature);
