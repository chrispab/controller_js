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

//createcomponenmts
// inputs
const light = new Light(mqttAgent);
const temperatureSensor = new TemperatureSensor(mqttAgent);
// outputs
const vent = new Vent(mqttAgent);
const fan = new Fan("fan",cfg.get("hardware.fan.pin"),mqttAgent);
const heater = new Heater(mqttAgent);


setInterval(() => {
    cfg.process();

    temperatureSensor.process();

    fan.process();

    heater.process();

    light.process();

    let setpoint = cfg.get("zone.highSetpoint");
    vent.control(temperatureSensor.getTemperature(), temperatureSensor.getHumidity(), setpoint, light.getState());
    vent.process();

    mqttAgent.process([vent, temperatureSensor, fan, heater, light]);

}, 1000);


let processCount = 0;
function process() {
    processCount = processCount ? processCount + 1 : 1;
    // console.log(`loop count: ${processCount}, ` + getHMSStr() + temperatureSensor.getSensorStr() + ` fan ${fan.getState()} heater ${heater.getState()}`);
    // console.log(os.hostname())
}

