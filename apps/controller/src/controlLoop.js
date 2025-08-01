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
import * as utils from './utils/utils.js';

// Application state
let controllerStatus = {
  zoneName: cfg.get('zone.name'),
  version: getVersionInfo().version,
  releaseNotes: getVersionInfo().releaseNotes,
  description: getVersionInfo().description,
  setpoint: null,
  highSetpoint: cfg.get('zone.highSetpoint'),
  lowSetpoint: cfg.get('zone.lowSetpoint'),
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
function updateStausAndWSBroadcastStatusIfValueChanged(controllerStatusKey, newValue) {
  // logger.warn();
  if (controllerStatus[controllerStatusKey] !== newValue) {
    controllerStatus[controllerStatusKey] = newValue;
    controllerStatus.lastChange = `${controllerStatusKey} = ${newValue}`;
    controllerStatus.timeStamp = Date.now();
    logger.warn(`updateAndBroadcastStatus:${controllerStatusKey} = ${newValue}, controllerStatus update, websocket broadcast`);
    webSocketBroadcast(controllerStatus);
  }
}

import registerEventHandlers from './services/eventHandlers/index.js';

function startControlLoop() {
  // --- Initialize Components ---
  // These are now autonomous. They will manage their own state and cycles.
  const fan = new Fan('fan', cfg.get('hardware.fan.pin'));
  const heater = new Heater('heater', cfg.get('hardware.heater.pin'));
  const light = new Light('light', cfg.get('hardware.RC.pin'));
  const temperatureSensor = new TemperatureSensor('temperature_sensor', cfg.get('hardware.dhtSensor.pin'));
  const vent = new Vent('vent', cfg.get('hardware.vent.pin'), cfg.get('hardware.vent.speedPin'));
  logger.info('Components initialized.');

  // mark pump as off - dummy setting pump not yet implemented
  updateStausAndWSBroadcastStatusIfValueChanged('irrigationPump', false);

  // --- Setup Event Listeners ---
  registerEventHandlers();

  // --- Periodic Services ---
  setInterval(() => cfg.process(), 1000); // Check for config changes
  setInterval(() => mqttAgent.process(), 5000); // Process MQTT Agent periodically

  setInterval(() => {
    updateStausAndWSBroadcastStatusIfValueChanged('ventOnDurationDaySecs', cfg.get('vent.onDurationMs.day') / 1000);
    updateStausAndWSBroadcastStatusIfValueChanged('ventOffDurationDaySecs', cfg.get('vent.offDurationMs.day') / 1000);
    updateStausAndWSBroadcastStatusIfValueChanged('ventOnDurationNightSecs', cfg.get('vent.onDurationMs.night') / 1000);
    updateStausAndWSBroadcastStatusIfValueChanged('ventOffDurationNightSecs', cfg.get('vent.offDurationMs.night') / 1000);
    // updateStausAndWSBroadcastStatusIfValueChanged('outsideTemperature', mqttAgent.outsideTemperature);
  }, 1000);

  logger.info('Event-driven control loop started.');
}


export { startControlLoop, controllerStatus, updateStausAndWSBroadcastStatusIfValueChanged };
