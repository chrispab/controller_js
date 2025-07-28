// src/controlLoop.js
import Light from './components/light.js';
import TemperatureSensor from './components/temperatureSensor.js';
import Fan from './components/fan.js';
import Heater from './components/heater.js';
import Vent from './components/vent.js';

import cfg from './services/config.js';
import mqttAgent from './services/mqttAgent.js';
import { webSocketBroadcast } from './services/webSocketServer.js';
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
  ventOnDurationDaySecs: null,
  ventOffDurationDaySecs: null,
  ventOnDurationNightSecs: null,
  ventOffDurationNightSecs: null,
  outsideTemperature: null,
  activeSetpoint: null,
};

let previousStatus = { ...controllerStatus };

/**
 * Updates the controller status for a given key if the value has changed,
 * logs the change, updates the timestamp, and ws-broadcasts the new status.
 *
 * @param {string} controllerStatusKey - The key in the controller status to update.
 * @param {*} newValue - The new value to set for the specified key.
 */
function updateAndBroadcastStatusIfValueChanged(controllerStatusKey, newValue) {
  // logger.warn();
  if (controllerStatus[controllerStatusKey] !== newValue) {
    controllerStatus[controllerStatusKey] = newValue;
    controllerStatus.lastChange = `${controllerStatusKey} = ${newValue}`;
    controllerStatus.timeStamp = Date.now();
    logger.warn(`State changed: ${controllerStatus.lastChange}`);
    webSocketBroadcast(controllerStatus);
  }
}

function startControlLoop() {
  // --- Initialize Components ---
  // These are now autonomous. They will manage their own state and cycles.
  const fan = new Fan('fan', cfg.get('hardware.fan.pin'));
  const heater = new Heater('heater', cfg.get('hardware.heater.pin'));
  const light = new Light('light', cfg.get('hardware.RC.pin'));
  const temperatureSensor = new TemperatureSensor(
    'temperature_sensor',
    cfg.get('hardware.dhtSensor.pin'),
  );
  const vent = new Vent(
    'vent',
    cfg.get('hardware.vent.pin'),
    cfg.get('hardware.vent.speedPin'),
  );
  logger.info('Components initialized.');

  // mark pump as off - dummy setting pump not yet implemented
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
    const newSetpoint = lightState
      ? cfg.get('zone.highSetpoint')
      : cfg.get('zone.lowSetpoint');
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
    updateAndBroadcastStatusIfValueChanged('ventOnDurationDaySecs', cfg.get('vent.onDurationMs.day') / 1000);
    updateAndBroadcastStatusIfValueChanged('ventOffDurationDaySecs', cfg.get('vent.offDurationMs.day') / 1000);
    updateAndBroadcastStatusIfValueChanged('ventOnDurationNightSecs', cfg.get('vent.onDurationMs.night') / 1000);
    updateAndBroadcastStatusIfValueChanged('ventOffDurationNightSecs', cfg.get('vent.offDurationMs.night') / 1000);
    // updateAndBroadcastStatusIfValueChanged('outsideTemperature', mqttAgent.outsideTemperature);
  }, 1000);

  //instead listen for events like  ventDurationChanged
  eventEmitter.on('ventDurationChanged', ({ period, duration }) => {
    if (period === 'day') {
  }
});


  logger.info('Event-driven control loop started.');
}

export {
  startControlLoop,
  controllerStatus,
  updateAndBroadcastStatusIfValueChanged,
};
