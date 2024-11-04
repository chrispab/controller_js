//import classes
//inputs
import Light from "./components/light.js";
import TemperatureSensor from "./components/temperatureSensor.js";
//outputs
import Fan from "./components/fan.js";
import Heater from "./components/heater.js";
import Vent from "./components/vent.js";

//import services as single instances
// import os from 'os';
import logger from "./services/logger.js";
import cfg from "./services/config.js";
import emitterManager from "./services/emitterManager.js";
import mqttAgent from "./services/mqttAgent.js";

//create components
// inputs
const fan = new Fan("fan", cfg.get("hardware.fan.pin"), mqttAgent);
const light = new Light("light", cfg.get("hardware.RC.pin"), mqttAgent);
const vent = new Vent(
  "vent",
  cfg.get("hardware.vent.pin"),
  cfg.get("hardware.vent.speedPin"),
  mqttAgent
);
const heater = new Heater("heater", cfg.get("hardware.heater.pin"), mqttAgent);

const temperatureSensor = new TemperatureSensor("temperature_sensor", cfg.get("hardware.dhtSensor.pin"),mqttAgent);



setInterval(() => {
  cfg.process();

  temperatureSensor.process();

  fan.process();

  heater.process();

  light.process();

  let setpoint = cfg.get("zone.highSetpoint");
  vent.control(
    temperatureSensor.getTemperature(),
    temperatureSensor.getHumidity(),
    setpoint,
    light.getState()
  );
  vent.process();

  mqttAgent.process([vent, temperatureSensor, fan, heater, light]);
}, 1000);

let processCount = 0;
function process() {
  processCount = processCount ? processCount + 1 : 1;
  // console.log(`loop count: ${processCount}, ` + getHMSStr() + temperatureSensor.getSensorStr() + ` fan ${fan.getState()} heater ${heater.getState()}`);
  // console.log(os.hostname())
}
