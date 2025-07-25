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

function updateAndBroadcastStatus(key, value) {
  if (controllerStatus[key] !== value) {
    controllerStatus[key] = value;
    controllerStatus.lastChange = `${key} = ${value}`;
    controllerStatus.timeStamp = Date.now();
    logger.info(`State changed: ${controllerStatus.lastChange}`);
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

  updateAndBroadcastStatus('irrigationPump', false);

  // --- Setup Event Listeners to Update Global Status ---
  eventEmitter.on('temperatureChanged', ({ temperature }) => {
    updateAndBroadcastStatus('temperature', temperature);
  });

  eventEmitter.on('humidityChanged', ({ humidity }) => {
    updateAndBroadcastStatus('humidity', humidity);
  });

  eventEmitter.on('lightStateChanged', ({ lightState }) => {
    updateAndBroadcastStatus('light', lightState);
    // Update setpoint when light state changes
    const newSetpoint = lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    updateAndBroadcastStatus('setpoint', newSetpoint);
    mqttAgent.setactiveSetpoint(newSetpoint);
  });

  eventEmitter.on('fanStateChanged', ({ state }) => {
    updateAndBroadcastStatus('fan', state);
  });

  eventEmitter.on('heaterStateChanged', ({ state }) => {
    updateAndBroadcastStatus('heater', state);
  });

  eventEmitter.on('ventStateChanged', ({ state }) => {
    updateAndBroadcastStatus('ventTotal', state);
    updateAndBroadcastStatus('ventPower', state > 0 ? 1 : 0);
    updateAndBroadcastStatus('ventSpeed', state === 2 ? 1 : 0);
  });

  // --- Periodic Services ---
  setInterval(() => cfg.process(), 1000); // Check for config changes
  setInterval(() => mqttAgent.process(), 5000); // Process MQTT Agent periodically
  setInterval(() => {
    updateAndBroadcastStatus('ventOnDeltaSecs', cfg.get('vent.onMs') / 1000);
    updateAndBroadcastStatus('ventOffDeltaSecs', cfg.get('vent.offMs') / 1000);
  }, 1000);

  logger.info('Event-driven control loop started.');
}

export { startControlLoop, controllerStatus };
