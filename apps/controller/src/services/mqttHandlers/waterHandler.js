import handleMessage from './genericHandler.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

function setRawSoilMoisture(topic, value) {
  updateStausAndWSBroadcastStatusIfValueChanged('SensorSoilMoistureRaw', parseFloat(value));
}

function setSoilMoisturePercent(topic, value) {
  updateStausAndWSBroadcastStatusIfValueChanged('soilMoisturePercent', parseFloat(value));
}

function setIrrigationPumpState(topic, value) {
  updateStausAndWSBroadcastStatusIfValueChanged('irrigationPump', value === 'ON');
}

export const handleSensorSoilMoistureRaw = (topic, payload) => handleMessage(topic, payload, setRawSoilMoisture);
export const handleSoilMoisturePercent = (topic, payload) => handleMessage(topic, payload, setSoilMoisturePercent);
export const handleIrrigationPumpState = (topic, payload) => handleMessage(topic, payload, setIrrigationPumpState);
