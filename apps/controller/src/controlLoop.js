// src/controlLoop.js
import Light from './components/light.js';
import TemperatureHumiditySensor from './components/TemperatureHumiditySensor.js';
import Fan from './components/fan.js';
import Heater from './components/heater.js';
import Vent from './components/vent.js';
import IOBase from './components/IOBase.js';
import { Gpio } from 'onoff';

import cfg from './services/config.js';
// import mqttAgent from './services/mqttAgent.js';
import { getPackageInfo } from './utils/utils.js';
import logger from './services/logger.js';
// import eventEmitter from './services/eventEmitter.js';
import * as utils from './utils/utils.js';
import ImmutableStateManager from './services/stateManager.js';
import registerEventHandlers from './services/eventHandlers/index.js';

// --- Initialize State Manager ---
const initialState = {
  zoneName: cfg.get('zone.name')+cfg.get('zoneId'),
  // version: getPackageInfo().version,
  // releaseNotes: getPackageInfo().releaseNotes,
  // description: getPackageInfo().description,
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
  irrigationPump: 0,
  lastChange: null,
  ventOnDurationDaySecs: cfg.get('vent.onDurationMs.day') / 1000,
  ventOffDurationDaySecs: cfg.get('vent.offDurationMs.day') / 1000,
  ventOnDurationNightSecs: cfg.get('vent.onDurationMs.night') / 1000,
  ventOffDurationNightSecs: cfg.get('vent.offDurationMs.night') / 1000,
  outsideTemperature: null,
  activeSetpoint: null,
  fanOnDurationSecs: cfg.get('fan.onDurationMs')/1000,
  fanOffDurationSecs: cfg.get('fan.offDurationMs')/1000,
};

export const stateManager = new ImmutableStateManager(initialState);
function startControlLoop() {
  // --- Initialize Components ---
  const fan = new Fan('fan', cfg.get('hardware.fan.pin'));
  const heater = new Heater('heater', cfg.get('hardware.heater.pin'));
  const light = new Light('light', cfg.get('hardware.RC.pin'));
  const temperatureHumiditySensor = new TemperatureHumiditySensor('temperatureHumiditySensor');
  const vent = new Vent('vent', cfg.get('hardware.vent.pin'), cfg.get('hardware.vent.speedPin'));

  // utils.sendEmail(stateManager.getState().zoneName + ' is starting up', 'zone startup');
  utils.sendEmail(cfg.get('zone.name') + cfg.get('zoneId') + ' is starting up', 'zone startup');

  logger.info('Components initialized.');

  // stateManager.update({ irrigationPump: false });

  // --- Setup Event Listeners ---
  registerEventHandlers();

  //-- enable board op master control ---
  const alivePin = new IOBase(cfg.get('hardware.alive.pin'), 'out', 1);
  // --- Periodic Services ---
  setInterval(() => cfg.process(), 1000);

  logger.info('Event-driven control loop started.');
}

export { startControlLoop };
