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
// const mqttAgent = new MqttAgent(client);


// const winston = require('winston');
import winston from 'winston';
import { format } from 'winston';
import { transports } from 'winston';
// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.json(),
//     transports: [new winston.transports.Console()],
//   });

//   const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.cli(),
//     transports: [new winston.transports.Console()],
//   });
const logger = winston.createLogger({
    // level: 'debug',
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'controller_js' },
    transports: [
        // new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/controller_js-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/controller_js-combined.log' })
    ]
});
//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
// if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
// }

//componenmts
const vent = new Vent(cfg.get("hardware.vent.pin"), 76000, 10000, emitterManager, mqttAgent);
const fan = new Fan(cfg.get("hardware.fan.pin"), 20000, 20000, emitterManager, mqttAgent);
const light = new Light(cfg.get("hardware.RC.pin"), emitterManager, mqttAgent);

const temperatureSensor = new TemperatureSensor(cfg.get("hardware.dhtSensor.type"), cfg.get("hardware.dhtSensor.pin"), emitterManager, mqttAgent);
const heater = new Heater(cfg.get("hardware.heater.pin"), 10000, 10000, emitterManager, mqttAgent);
// const log = new Logger(config.logging.level, config.logging.enabled);


// mqttAgent.client.connect(cfg.get("mqtt.brokerUrl"));
// mqttAgent.client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);

// mqttAgent.client.on('message', (topic, message) => {
//     // console.log(`Received message on topic ${topic}: ${message}`);
// });


//set initial state
// fan.setState(false);
// heater.setState(false); //turn off by default
// vent.setState(false);

setInterval(() => {
    // scan/process inputs
    // logger.error(`Sensor:${temperatureSensor.getSensorStr()}. Fan: ${fan.getState()}, Heater: ${heater.getState()}`);

    temperatureSensor.process();

    fan.process();

    heater.process();

    light.process();

    mqttAgent.process();
    process();

    // vent.process();
    const setPoint = 21.5;
    vent.control(temperatureSensor.getTemperature(), temperatureSensor.getHumidity(), setPoint, light.getState(), Date.now());

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