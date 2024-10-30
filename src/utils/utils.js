// import IOBase from "./IOBase.js";
import Logger from "../services/logger.js";


// import config from '../config/config.json' assert { type: 'json' };
import cfg from "config";

var fanStateEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'MQTT->Fan: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.outTopicPrefix") + "/fan_state", `${state ? 1 : 0}`);
}

const logLevel = 'debug';
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
// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});
// List the current wifi connections
const mod1Function = () => wifi.getCurrentConnections((error, currentConnections) => {
  if (error) {
    console.log(error);
  } else {
    logger.warn("UTILS-MOD1: currentConnections");

    // logger.warn(currentConnections);
    // console.warn(currentConnections);

    return currentConnections;
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

export { mod1Function }