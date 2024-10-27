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
const vent = new Vent(cfg.get("hardware.vent.pin"), 90000, 5000, emitterManager, mqttAgent);
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

}, 2000);



function getHMSStr() {
    const date = new Date(Date.now());
    const hh = `0${date.getHours()}`.slice(-2);
    const mm = `0${date.getMinutes()}`.slice(-2);
    const ss = `0${date.getSeconds()}`.slice(-2);
    // console.log(`${hh}:${mm}:${ss}`);
    return `${hh}:${mm}:${ss}`;
}


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

// const wifi = require('node-wifi');
import wifi from 'node-wifi';
// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
    iface: null // network interface, choose a random wifi interface if set to null
  });
// List the current wifi connections
wifi.getCurrentConnections((error, currentConnections) => {
    if (error) {
      console.log(error);
    } else {
      console.log(currentConnections);

      
      /*
      // you may have several connections
      [
          {
              iface: '...', // network interface used for the connection, not available on macOS
              ssid: '...',
              bssid: '...',
              mac: '...', // equals to bssid (for retrocompatibility)
              channel: <number>,
              frequency: <number>, // in MHz
              signal_level: <number>, // in dB
              quality: <number>, // same as signal level but in %
              security: '...' //
              security_flags: '...' // encryption protocols (format currently depending of the OS)
              mode: '...' // network mode like Infra (format currently depending of the OS)
          }
      ]
      */
    }
  });