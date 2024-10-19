//import classes
import Fan from "./lib/fan.js";
import Heater from "./lib/heater.js";
import TemperatureSensor from "./lib/temperatureSensor.js";
import Vent from "./lib/vent.js";
import Light from "./lib/light.js";
// const os = require('os');
import os from 'os';

import logger from "./lib/logger.js";

import config from './config.json' assert { type: 'json' }; // NodeJS version.

import mqtt from 'mqtt';
const client = mqtt.connect(config.mqtt.brokerUrl);

client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);

client.on('message', (topic, message) => {
    console.log(`Received message on topic ${topic}: ${message}`);
});


//create objects
const fan = new Fan();
const temperatureSensor = new TemperatureSensor(config.hardware.dhtSensor.type, config.hardware.dhtSensor.pin);
const heater = new Heater();
const vent = new Vent();
const light = new Light(config.hardware.RC.pin);

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


    process();
}, 3000);

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