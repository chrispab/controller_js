// src/controlLoop.js
import Light from './components/light.js';
import TemperatureSensor from './components/temperatureSensor.js';
import Fan from './components/fan.js';
import Heater from './components/heater.js';
import Vent from './components/vent.js';

import cfg from './services/config.js';
import mqttAgent from './services/mqttAgent.js';
import { broadcast } from './services/webSocketServer.js';
import { getVersionInfo } from './utils/utils.js';
import logger from './services/logger.js';
import eventEmitter from './services/eventEmitter.js';

// Application state
let controllerStatus = {
  zoneName: cfg.get('zone.name'),
  version: getVersionInfo().version,
  releaseNotes: getVersionInfo().releaseNotes,
  description: getVersionInfo().description,
  setpoint: null,
  timeStamp: null,
  temperature: null,
  humidity: null,
  light: null,
  heater: null,
  fan: null,
  ventPower: null,
  ventSpeed: null,
  ventTotal: null,
  SensorSoilMoistureRaw: null,
  soilMoisturePercent: null,
  irrigationPump: null,
  lastChange: null,
  ventOnDeltaSecs: null,
  ventOffDeltaSecs: null,
};

let previousStatus = { ...controllerStatus };

function updateAndBroadcastStatusIfValueChanged(key, value) {
  if (controllerStatus[key] !== value) {
    controllerStatus[key] = value;
    controllerStatus.lastChange = `${key} = ${value}`;
    controllerStatus.timeStamp = Date.now();
    logger.warn(`State changed: ${controllerStatus.lastChange}`);
    broadcast(controllerStatus);
  }
}

function startControlLoop() {
  // --- Initialize Components ---
  // These are now autonomous. They will manage their own state and cycles.
  const fan = new Fan('fan', cfg.get('hardware.fan.pin'));
  const heater = new Heater('heater', cfg.get('hardware.heater.pin'));
  const light = new Light('light', cfg.get('hardware.RC.pin'));
  const temperatureSensor = new TemperatureSensor('temperature_sensor', cfg.get('hardware.dhtSensor.pin'));
  const vent = new Vent('vent', cfg.get('hardware.vent.pin'), cfg.get('hardware.vent.speedPin'));
  logger.info('Components initialized.');

  updateAndBroadcastStatusIfValueChanged('irrigationPump', false);

  // --- Setup Event Listeners to Update Global Status ---
  eventEmitter.on('temperatureChanged', ({ temperature }) => {
    updateAndBroadcastStatusIfValueChanged('temperature', temperature);
  });

  eventEmitter.on('humidityChanged', ({ humidity }) => {
    updateAndBroadcastStatusIfValueChanged('humidity', humidity);
  });

  eventEmitter.on('lightStateChanged', ({ lightState }) => {
    updateAndBroadcastStatusIfValueChanged('light', lightState);
    // Update setpoint when light state changes
    const newSetpoint = lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    updateAndBroadcastStatusIfValueChanged('setpoint', newSetpoint);
    mqttAgent.setactiveSetpoint(newSetpoint);
  });

  eventEmitter.on('fanStateChanged', ({ state }) => {
    updateAndBroadcastStatusIfValueChanged('fan', state);
  });

  eventEmitter.on('heaterStateChanged', ({ state }) => {
    updateAndBroadcastStatusIfValueChanged('heater', state);
  });

  eventEmitter.on('ventStateChanged', ({ state }) => {
    updateAndBroadcastStatusIfValueChanged('ventTotal', state);
    updateAndBroadcastStatusIfValueChanged('ventPower', state > 0 ? 1 : 0);
    updateAndBroadcastStatusIfValueChanged('ventSpeed', state === 2 ? 1 : 0);
  });

  // --- Periodic Services ---
  setInterval(() => cfg.process(), 1000); // Check for config changes
  setInterval(() => mqttAgent.process(), 5000); // Process MQTT Agent periodically
  setInterval(() => {
    updateAndBroadcastStatusIfValueChanged('ventOnDeltaSecs', cfg.get('vent.onMs') / 1000);
    updateAndBroadcastStatusIfValueChanged('ventOffDeltaSecs', cfg.get('vent.offMs') / 1000);
  }, 1000);

  logger.info('Event-driven control loop started.');
}

export { startControlLoop, controllerStatus };
