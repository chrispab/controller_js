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

import config from './config/config.json' assert { type: 'json' }; // NodeJS version.


import mqtt from 'mqtt';
const client = mqtt.connect(config.mqtt.brokerUrl);
import MqttAgent from "./services/mqttAgent.js";


import EmitterManager from "./services/emitterManager.js";

const emitterManager = new EmitterManager();


//create objects

const mqttAgent = new MqttAgent(client, config.mqtt.brokerUrl);
const fan = new Fan();
const temperatureSensor = new TemperatureSensor(config.hardware.dhtSensor.type, config.hardware.dhtSensor.pin);
const heater = new Heater();
const vent = new Vent(config.hardware.vent.pin, 10000, 30000, emitterManager,mqttAgent);
const light = new Light(config.hardware.RC.pin);//Logger
// const log = new Logger(config.logging.level, config.logging.enabled);


mqttAgent.client.connect(config.mqtt.brokerUrl);
mqttAgent.client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);

mqttAgent.client.on('message', (topic, message) => {
    // console.log(`Received message on topic ${topic}: ${message}`);
});



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