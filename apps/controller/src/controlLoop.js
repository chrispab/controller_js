// src/controlLoop.js
import Light from './components/light.js';
import TemperatureHumiditySensor from './components/TemperatureHumiditySensor.js';
import Fan from './components/fan.js';
import Heater from './components/heater.js';
import Vent from './components/vent.js';

import dataStore from './services/dataStore.js';
import mqttAgent from './services/mqttAgent.js';
import { getVersionInfo } from './utils/utils.js';
import logger from './services/logger.js';
import eventEmitter from './services/eventEmitter.js';
import * as utils from './utils/utils.js';

import registerEventHandlers from './services/eventHandlers/index.js';

// --- Initialize State Manager ---
function startControlLoop() {
  // --- Initialize Components ---
  const fan = new Fan('fan', dataStore.get('config.hardware.fan.pin'));
  const heater = new Heater('heater', dataStore.get('config.hardware.heater.pin'));
  const light = new Light('light', dataStore.get('config.hardware.RC.pin'));
  const temperatureHumiditySensor = new TemperatureHumiditySensor('temperatureHumiditySensor', dataStore.get('config.hardware.dhtSensor.pin'));
  const vent = new Vent('vent', dataStore.get('config.hardware.vent.pin'), dataStore.get('config.hardware.vent.speedPin'));

  mqttAgent.sendStartupEmail();
  logger.info('Components initialized.');

  dataStore.set('state.irrigationPump', false);

  // --- Setup Event Listeners ---
  registerEventHandlers();

  // --- Periodic Services ---
  setInterval(() => {
    dataStore.set('state.ventOnDurationDaySecs', dataStore.get('config.vent.onDurationMs.day') / 1000);
    dataStore.set('state.ventOffDurationDaySecs', dataStore.get('config.vent.offDurationMs.day') / 1000);
    dataStore.set('state.ventOnDurationNightSecs', dataStore.get('config.vent.onDurationMs.night') / 1000);
    dataStore.set('state.ventOffDurationNightSecs', dataStore.get('config.vent.offDurationMs.night') / 1000);
  }, 1000);

  logger.info('Event-driven control loop started.');
}

export { startControlLoop };
