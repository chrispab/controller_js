import handleMessage from './genericHandler.js';
import { stateManager } from '../../controlLoop.js';

function setRawSoilMoisture(topic, value) {
  stateManager.update({ SensorSoilMoistureRaw: parseFloat(value) });
}

function setSoilMoisturePercent(topic, value) {
  stateManager.update({ soilMoisturePercent: parseFloat(value) });
}

function setIrrigationPumpState(topic, value) {
  stateManager.update({ irrigationPump: value === 'ON' });
}

export const handleSensorSoilMoistureRaw = (topic, payload) => 
  handleMessage(topic, payload, setRawSoilMoisture);

export const handleSoilMoisturePercent = (topic, payload) => 
  handleMessage(topic, payload, setSoilMoisturePercent);

export const handleIrrigationPumpState = (topic, payload) => 
  handleMessage(topic, payload, setIrrigationPumpState);
