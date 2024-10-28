//import classes
import Fan from "./components/fan.js";
import Heater from "./components/heater.js";
import TemperatureSensor from "./components/temperatureSensor.js";
import Vent from "./components/vent.js";
import Light from "./components/light.js";
// import Mqtt from "./services/mqttAgent.js";
// const os = require('os');
// import os from 'os';

// import Logger from "./services/Logger.js";

// import config from './config/config.json' assert { type: 'json' }; // NodeJS version.

// var cfg = require('config');
import cfg from "config";

//import services
//single instance
import emitterManager from "./services/emitterManager.js";
import mqttAgent from "./services/mqttAgent.js";


//componenmts
const vent = new Vent(cfg.get("hardware.vent.pin"), 15000, 45000, emitterManager, mqttAgent);
const fan = new Fan(cfg.get("hardware.fan.pin"), 20000, 20000, emitterManager, mqttAgent);
const light = new Light(cfg.get("hardware.RC.pin"), emitterManager, mqttAgent);

const temperatureSensor = new TemperatureSensor(cfg.get("hardware.dhtSensor.type"), cfg.get("hardware.dhtSensor.pin"), emitterManager, mqttAgent);
const heater = new Heater(cfg.get("hardware.heater.pin"), 10000, 10000, emitterManager, mqttAgent);
// const log = new Logger(config.logging.level, config.logging.enabled);



setInterval(() => {
    // scan/process inputs
    // logger.error(`Sensor:${temperatureSensor.getSensorStr()}. Fan: ${fan.getState()}, Heater: ${heater.getState()}`);
    mqttAgent.process([vent, temperatureSensor, fan, heater, light]);

    temperatureSensor.process();

    fan.process();

    heater.process();

    light.process();

    // vent.process();
    let highSetPoint = 21.5;
    // highSetPoint = cfg.get("highSetpoint");
    vent.control(temperatureSensor.getTemperature(), temperatureSensor.getHumidity(), highSetPoint, light.getState(), Date.now());

}, 1000);




let processCount = 0;
function process() {
    processCount = processCount ? processCount + 1 : 1;
    // console.log(`loop count: ${processCount}, ` + getHMSStr() + temperatureSensor.getSensorStr() + ` fan ${fan.getState()} heater ${heater.getState()}`);
    // console.log(os.hostname())
}

function saveConfig() {
    var fs = require('fs');
    var file_content = fs.readFileSync("default.json");
    var content = JSON.parse(file_content);
    content.SERVER.port = 6000;
    fs.writeFileSync("default2.json", JSON.stringify(content));
}

