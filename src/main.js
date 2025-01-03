//import classes
//inputs
import Light from "./components/light.js";
import TemperatureSensor from "./components/temperatureSensor.js";
//outputs
import Fan from "./components/fan.js";
import Heater from "./components/heater.js";
import Vent from "./components/vent.js";
import * as utils from './utils/utils.js';

//import services as single instances
// import os from 'os';
// import logger from "./services/logger.js";
import cfg from "./services/config.js";
import mqttAgent from "./services/mqttAgent.js";

//create components
// inputs
// const fan = new Fan("fan", cfg.get("hardware.fan.pin"), mqttAgent);
const fan = new Fan("fan", cfg.get("hardware.fan.pin"));
const heater = new Heater("heater", cfg.get("hardware.heater.pin"));
const light = new Light("light", cfg.get("hardware.RC.pin"));
const temperatureSensor = new TemperatureSensor("temperature_sensor", cfg.get("hardware.dhtSensor.pin"));
const vent = new Vent("vent", cfg.get("hardware.vent.pin"), cfg.get("hardware.vent.speedPin"));



setInterval(() => {

  cfg.process();

  temperatureSensor.process();
  let temperature = temperatureSensor.getTemperature();
  // temperature = 13;

  light.process();
  let lightState = light.getState();
  // lightState = 0;

  let setpoint = cfg.get("zone.highSetpoint");
  if (lightState == 0) {
    setpoint = cfg.get("zone.lowSetpoint");
  }


  vent.control(temperature, setpoint, lightState);
  vent.process();

  heater.control(temperature, setpoint, lightState, mqttAgent.outsideTemperature);
  heater.process();

  fan.process();
  
  mqttAgent.setCurrentSetpoint(setpoint);
  mqttAgent.process([vent, temperatureSensor, fan, heater, light]);

}, 1000);


