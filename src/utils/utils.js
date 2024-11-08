// import IOBase from "./IOBase.js";
// import Logger from "../services/logger.js";
// import config from '../config/config.json' assert { type: 'json' };
// import cfg from "config";
// const logLevel = 'debug';
// const logLevel = 'info';

function getHMSStr() {
  const date = new Date(Date.now());
  const hh = `0${date.getHours()}`.slice(-2);
  const mm = `0${date.getMinutes()}`.slice(-2);
  const ss = `0${date.getSeconds()}`.slice(-2);
  // console.log(`${hh}:${mm}:${ss}`);
  return `${hh}:${mm}:${ss}`;
}


// const wifi = require('node-wifi');
import wifi from 'node-wifi';
import logger from "../services/logger.js";
import mqttAgent from '../services/mqttAgent.js';
// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});
// List the current wifi connections

// export { mod1Function, mod1Function2 }


const logAndPublishState = (comment, topic, state) => {
  var logLevel = "info";
  logger.log(logLevel, ">>" + comment + `: ${topic + ": " + state}`);
  mqttAgent.client.publish(topic, `${state}`);
}

// export utils;
export { logAndPublishState,getHMSStr }