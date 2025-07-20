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

function startControlLoop() {
  //create components
  const fan = new Fan('fan', cfg.get('hardware.fan.pin'));
  const heater = new Heater('heater', cfg.get('hardware.heater.pin'));
  const light = new Light('light', cfg.get('hardware.RC.pin'));
  const temperatureSensor = new TemperatureSensor('temperature_sensor', cfg.get('hardware.dhtSensor.pin'));
  const vent = new Vent('vent', cfg.get('hardware.vent.pin'), cfg.get('hardware.vent.speedPin'));

  setInterval(() => {
    temperatureSensor.process();
    let temperature = temperatureSensor.getTemperature();

    light.process();
    let lightState = light.getState();

    let setpoint = lightState == false ? cfg.get('zone.lowSetpoint') : cfg.get('zone.highSetpoint');

    vent.control(temperature, setpoint, lightState);
    vent.process();

    heater.control(temperature, setpoint, lightState, mqttAgent.outsideTemperature);
    heater.process();

    fan.control();
    fan.process();

    mqttAgent.setactiveSetpoint(setpoint);
    mqttAgent.process([vent, temperatureSensor, fan, heater, light]);

    // Update controllerStatus object with current component states and sensor readings
    // some also set by mqtt sub handlers, e.g. soilmoisture
    Object.assign(controllerStatus, {
      temperature: temperature,
      humidity: temperatureSensor.getHumidity(),
      light: lightState,
      heater: heater.getState(),
      fan: fan.getState(),
      ventPower: vent.ventPowerPin.getState(),
      ventSpeed: vent.ventSpeedPin.getState(),
      ventTotal: vent.getState(),
      ventOnDeltaSecs: cfg.get('vent.onMs') / 1000,
      irrigationPump: 0
    });

    // Only broadcast web socket data if a state has changed
    broadcastIfChanged(controllerStatus);

    // Process configuration changes (e.g., save to file if updated)
    cfg.process();
  }, 1000);
}

let controllerStatus = {
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
  soilMoisture: null,
  irrigationPump: null,
};
// Initialize previousStatus with a copy of controllerStatus to track changes
let previousStatus = { ...controllerStatus }; // Initialize previousStatus with a copy of controllerStatus
// Counter for broadcast messages, used to periodically send header
// let broadcastCount = 0;

function broadcastIfChanged(status) {
  if (JSON.stringify(status) !== JSON.stringify(previousStatus)) {
    // add time change detected
    status.timeStamp = Date.now();
    // broadcastCount++;
    // if (broadcastCount % 5 === 0) {
    //   broadcast(`Time ---- [Te]--[Hu]--L-H-F-V-S-VT-`);
    // }
    broadcast(status);
    previousStatus = { ...status }; // Update previousStatus with the current status
  }
}

export { startControlLoop, controllerStatus };
