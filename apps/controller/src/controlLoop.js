// src/controlLoop.js
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
import eventEmitter from './services/eventEmitter.js';

// Component and service instances
let components = {};

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

function setupEventListeners() {
  eventEmitter.on('temperatureChanged', (temp) => {
    controllerStatus.temperature = temp;
    components.heater.control(controllerStatus.temperature, controllerStatus.setpoint, controllerStatus.light, mqttAgent.outsideTemperature);
    components.vent.control(controllerStatus.temperature, controllerStatus.setpoint, controllerStatus.light);
    broadcastIfChanged(controllerStatus);
  });

  eventEmitter.on('humidityChanged', (humidity) => {
    controllerStatus.humidity = humidity;
    broadcastIfChanged(controllerStatus);
  });

  eventEmitter.on('lightStateChanged', (state) => {
    controllerStatus.light = state;
    controllerStatus.setpoint = controllerStatus.light === false ? cfg.get('zone.lowSetpoint') : cfg.get('zone.highSetpoint');
    components.heater.control(controllerStatus.temperature, controllerStatus.setpoint, controllerStatus.light, mqttAgent.outsideTemperature);
    components.vent.control(controllerStatus.temperature, controllerStatus.setpoint, controllerStatus.light);
    broadcastIfChanged(controllerStatus);
  });

  eventEmitter.on('heaterStateChanged', (state) => {
    controllerStatus.heater = state;
    broadcastIfChanged(controllerStatus);
  });

  eventEmitter.on('fanStateChanged', (state) => {
    controllerStatus.fan = state;
    broadcastIfChanged(controllerStatus);
  });

  eventEmitter.on('ventStateChanged', (data) => {
    controllerStatus.ventPower = data.state;
    controllerStatus.ventSpeed = data.speed;
    controllerStatus.ventTotal = data.value;
    broadcastIfChanged(controllerStatus);
  });

  // Periodically process MQTT and config changes
  setInterval(() => {
    mqttAgent.setactiveSetpoint(controllerStatus.setpoint);
    mqttAgent.process([components.vent, components.temperatureSensor, components.fan, components.heater, components.light]);
    cfg.process();
  }, 1000);
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

  // Initialize vent status
  controllerStatus.ventPower = components.vent.ventPowerPin.getState();
  controllerStatus.ventSpeed = components.vent.ventSpeedPin.getState();
  controllerStatus.ventTotal = components.vent.getState();

  setupEventListeners();
}

export { startControlLoop, controllerStatus };