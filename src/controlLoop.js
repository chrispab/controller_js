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
// import { format } from 'winston';

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

    const status = {
      temperature: temperature,
      humidity: temperatureSensor.getHumidity(),
      light: lightState,
      heater: heater.getState(),
      fan: fan.getState(),
      ventPower: vent.ventPowerPin.getState(),
      ventSpeed: vent.ventSpeedPin.getState(),
      ventTotal: vent.getState(),
      ventOnDeltaSecs: cfg.get('vent.onMs') / 1000,
    };
    //only broadcast web socket data if a state has changed

    broadcastIfChanged(status);

    cfg.process();
  }, 1000);
}

let lastStatus = {
  temperature: null,
  humidity: null,
  light: null,
  heater: null,
  fan: null,
  ventPower: null,
  ventSpeed: null,
  ventTotal: null,
  ventOnDeltaSecs: null,
};
let broadcastCount = 0;

function broadcastIfChanged(status) {
  if (JSON.stringify(status) !== JSON.stringify(lastStatus)) {
    broadcastCount++;
    if (broadcastCount % 5 === 0) {
      broadcast(`Time ---- [Te]--[Hu]--L-H-F-V-S-VT-`);
    }
    var formattedStatus = formatStatus(status);
    formattedStatus = status;
    broadcast(formattedStatus);
    lastStatus = status;
  }
}

//function to format status info for broadcasting
function formatStatus(status) {
  // Version : 3.24 main: dark mode vent updates
  // Time ---- [Te]--[Hu]--L-H-F-V-S-VT
  // 17:07:47  23.0  59.9  0 0 0 1 0 1
  // Time ---- [Te]--[Hu]--L-H-F-V-S-VT

  //get time string
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;

  // Format temperature and humidity (assuming humidity is part of temperatureSensor data)
  // For now, just temperature is available in status.temperature
  const temperature = status.temperature !== undefined ? status.temperature : 'N/A';
  const humidity = status.humidity !== undefined ? status.humidity : 'N/A'; // Assuming humidity might be added later

  // Format boolean states to 0 or 1
  const lightState = status.light ? 1 : 0;
  const heaterState = status.heater ? 1 : 0;
  const fanState = status.fan ? 1 : 0;
  const ventState = status.vent ? 1 : 0;
  const ventSpeedState = status.ventSpeed ? 1 : 0;
  const ventTotal = ventState + ventSpeedState;

  // Construct the formatted string

  return `${timeString}  ${temperature}  ${humidity}  ${lightState} ${heaterState} ${fanState} ${ventState} ${ventSpeedState} ${ventTotal}`;
}

export { startControlLoop, lastStatus };
