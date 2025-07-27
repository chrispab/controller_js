import { updateAndBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import logger from '../logger.js';
import cfg from '../config.js';
import mqttAgent from '../mqttAgent.js';

export default function handleOutsideSensor(topic, message) {
  if (!message || message.length === 0) {
    logger.error('MQTT->Outside_Sensor: NULL OR EMPTY PAYLOAD RECEIVED');
    return;
  }
  try {
    const obj = JSON.parse(message.toString());
    const sensorName = cfg.get('mqtt.outsideSensorName') || 'DS18B20-1';
    const temperature = obj?.[sensorName]?.['Temperature'];

    if (typeof temperature !== 'undefined') {
      updateAndBroadcastStatusIfValueChanged('outsideTemperature', temperature);
    } else {
      logger.error(
        `MQTT->Outside_Sensor: Could not extract temperature from payload: ${message.toString()}`,
      );
    }
  } catch (e) {
    logger.error(
      `MQTT->Outside_Sensor: Failed to parse JSON payload: ${message.toString()}`,
      e,
    );
  }
}
