//import classes
import Fan from "./components/fan.js";
import Heater from "./components/heater.js";
import TemperatureSensor from "./lib/temperatureSensor.js";
import Vent from "./components/vent.js";
import Light from "./components/light.js";
import Mqtt from "./services/mqtt.js";
// const os = require('os');
import os from 'os';

import Logger from "./services/Logger.js";

import config from './config/config.json' assert { type: 'json' }; // NodeJS version.


import mqtt from 'mqtt';
const client = mqtt.connect(config.mqtt.brokerUrl);

client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);

client.on('message', (topic, message) => {
    // console.log(`Received message on topic ${topic}: ${message}`);
});

// const TicketManager = require("./services/ticketManager");
import EmitterManager from "./services/emitterManager.js";

const emitterManager = new EmitterManager(10);
var ventStateEvent = function (state) {
    Logger.log('info', 'event Vent state: ' + `${state}`);
    client.publish("ventStateEvent", `banana`);
  }
  emitterManager.on('ventState', ventStateEvent);


//create objects
const fan = new Fan();
const temperatureSensor = new TemperatureSensor(config.hardware.dhtSensor.type, config.hardware.dhtSensor.pin);
const heater = new Heater();
const vent = new Vent(config.hardware.vent.pin,emitterManager);
const light = new Light(config.hardware.RC.pin);
const mqttAgent = new Mqtt(config.hardware.RC.pin, config.hardware.RC.oscillation);
//Logger
// const log = new Logger(config.logging.level, config.logging.enabled);

//set initial state
fan.setState(false);
heater.setState(false); //turn off by default

setInterval(() => {
    // scan/process inputs
    temperatureSensor.process();

    fan.process();

    vent.process();

    heater.process();

    light.process();

    // setTimeout(() => { console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>-z'); }, 500);
    // setTimeout(console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>-z'), 500);
    // Logger.info(temperatureSensor.getSensorStr() + ` fan ${fan.getState()} heater ${heater.getState()}`);
    mqttAgent.process();
    process();
}, 5000);

let processCount = 0;
function getHMSStr() {
    const date = new Date(Date.now());
    const hh = `0${date.getHours()}`.slice(-2);
    const mm = `0${date.getMinutes()}`.slice(-2);
    const ss = `0${date.getSeconds()}`.slice(-2);
    // console.log(`${hh}:${mm}:${ss}`);
    return `${hh}:${mm}:${ss}`;
}



function process() {
    processCount = processCount ? processCount + 1 : 1;
    // console.log(`loop count: ${processCount}, ` + getHMSStr() + temperatureSensor.getSensorStr() + ` fan ${fan.getState()} heater ${heater.getState()}`);
    // console.log(os.hostname())
}