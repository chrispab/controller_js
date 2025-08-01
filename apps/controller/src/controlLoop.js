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

  // --- Setup Event Listeners to Update Global Status ---
  eventEmitter.on('temperatureChanged', ({ temperature }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('temperature', temperature);
  });

  eventEmitter.on('humidityChanged', ({ humidity }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('humidity', humidity);
  });

  eventEmitter.on('lightStateChanged', ({ lightState }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('light', lightState);
    // Update setpoint when light state changes
    const newSetpoint = lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    updateStausAndWSBroadcastStatusIfValueChanged('setpoint', newSetpoint);
    mqttAgent.setactiveSetpoint(newSetpoint);
  });

  //fan event handlers
  eventEmitter.on('fan/started', ({ name }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fan', true);
    utils.logAndPublishState('Event fan/started', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), 1);
  });

  eventEmitter.on('fan/stopped', ({ name }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fan', false);
    utils.logAndPublishState('Event fan/stopped', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), 0);
  });

  // handle fan duration change
  eventEmitter.on('fan/on-duration-changed', ({ onMs }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fanOnDurationSecs', onMs / 1000);
    utils.logAndPublishState('Event fan/on-duration-changed: ', cfg.getWithMQTTPrefix('fan.onMs'), onMs);
  });

  eventEmitter.on('fan/off-duration-changed', ({ offMs }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fanOffDurationSecs', offMs / 1000);
    utils.logAndPublishState('Event fan/off-duration-changed: ', cfg.getWithMQTTPrefix('fan.offMs'), offMs);
  });

  eventEmitter.on('heaterStateChanged', ({ state }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('heater', state);
  });

  eventEmitter.on('ventStateChanged', ({ state }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('ventTotal', state);
    updateStausAndWSBroadcastStatusIfValueChanged('ventPower', state > 0 ? 1 : 0);
    updateStausAndWSBroadcastStatusIfValueChanged('ventSpeed', state === 2 ? 1 : 0);
  });

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

  //instead listen for events like  ventDurationChanged
  eventEmitter.on('ventDurationChanged', ({ period, duration }) => {
    if (period === 'day') {
    }
  });

  logger.info('Event-driven control loop started.');
}

export { startControlLoop, controllerStatus, updateStausAndWSBroadcastStatusIfValueChanged };
