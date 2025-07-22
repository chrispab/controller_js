// src/controlLoop.js
//import classes
//inputs
import Light from './components/light.js';
import TemperatureSensor from './components/temperatureSensor.js';
//outputs
import Fan from './components/fan.js';
import Heater from './components/heater.js';
import Vent from './components/vent.js';

//import services as single instances
import cfg from './services/config.js';
import mqttAgent from './services/mqttAgent.js';
import { broadcast } from './services/webSocketServer.js';
import { getVersionInfo } from './utils/utils.js';
import logger from './services/logger.js';

// Component and service instances
let components;

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
  ventOnDeltaSecs: null,
  SensorSoilMoistureRaw: null,
  soilMoisturePercent: null,
  irrigationPump: null,
  lastChange: null,
};

// Previous state for change detection
let previousStatus = { ...controllerStatus };

function readSensors() {
  const { temperatureSensor } = components;
  temperatureSensor.process();
  controllerStatus.temperature = temperatureSensor.getTemperature();
  controllerStatus.humidity = temperatureSensor.getHumidity();
}

function updateLogicAndControl() {
  const { light, vent, heater, fan } = components;

  // Light
  light.process();
  controllerStatus.light = light.getState();

  // Setpoint
  controllerStatus.setpoint = controllerStatus.light === false ? cfg.get('zone.lowSetpoint') : cfg.get('zone.highSetpoint');

  // Vent
  vent.control(controllerStatus.temperature, controllerStatus.setpoint, controllerStatus.light);
  vent.process();

  // Heater
  heater.control(controllerStatus.temperature, controllerStatus.setpoint, controllerStatus.light, mqttAgent.outsideTemperature);
  heater.process();

  // Fan
  fan.control();
  fan.process();

  // Update status with component states
  Object.assign(controllerStatus, {
    heater: heater.getState(),
    fan: fan.getState(),
    ventPower: vent.ventPowerPin.getState(),
    ventSpeed: vent.ventSpeedPin.getState(),
    ventTotal: vent.getState(),
    ventOnDeltaSecs: cfg.get('vent.onMs') / 1000,
    irrigationPump: 0, // Note: This is currently hardcoded
  });
}

function processServices() {
  const { vent, temperatureSensor, fan, heater, light } = components;
  mqttAgent.setactiveSetpoint(controllerStatus.setpoint);
  mqttAgent.process([vent, temperatureSensor, fan, heater, light]);
  cfg.process();
}

function broadcastIfChanged(status) {
  const changes = [];
  // Find all changed fields
  for (const key in status) {
    if (Object.prototype.hasOwnProperty.call(status, key)) {
      if (status[key] !== previousStatus[key]) {
        changes.push({ key, value: status[key] });
      }
    }
  }

  // If there are changes, log the last one and broadcast
  if (changes.length > 0) {
    const lastChange = changes[changes.length - 1];
    status.lastChange = `${lastChange.key} = ${lastChange.value}`;
    logger.info(`State changed: ${status.lastChange}`);

    status.timeStamp = Date.now();
    broadcast(status);
    previousStatus = { ...status };
  }
}

function mainLoop() {
  try {
    readSensors();
    updateLogicAndControl();
    processServices();
    broadcastIfChanged(controllerStatus);
  } catch (error) {
    logger.error('Error in control loop:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

function startControlLoop() {
  // Create components
  components = {
    fan: new Fan('fan', cfg.get('hardware.fan.pin')),
    heater: new Heater('heater', cfg.get('hardware.heater.pin')),
    light: new Light('light', cfg.get('hardware.RC.pin')),
    temperatureSensor: new TemperatureSensor('temperature_sensor', cfg.get('hardware.dhtSensor.pin')),
    vent: new Vent('vent', cfg.get('hardware.vent.pin'), cfg.get('hardware.vent.speedPin')),
  };

  setInterval(mainLoop, 1000);
}

export { startControlLoop, controllerStatus };
