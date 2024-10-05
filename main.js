//import classes
import Fan from "./fan.js";


// import TemperatureSensor from "./temperatureSensor.js";
import Heater from "./heater.js";

import TemperatureSensor from "./temperatureSensor.js";

//create objects
const fan = new Fan();
const temperatureSensor = new TemperatureSensor();
const heater = new Heater();

//set initial state
fan.setState(false);
heater.setState(false); //turn off by default

setInterval(() => {
    // console.log( Date.now());

    process();
    fan.process();

    heater.process();

    temperatureSensor.process();

}, 1000);

let processCount = 0;
function logHMS() {
    const date = new Date(Date.now());
    const hh = `0${date.getHours()}`.slice(-2);
    const mm = `0${date.getMinutes()}`.slice(-2);
    const ss = `0${date.getSeconds()}`.slice(-2);
    // console.log(`${hh}:${mm}:${ss}`);
    return `${hh}:${mm}:${ss}`;
}


function process() {
    processCount = processCount ? processCount + 1 : 1;
    console.log(`loop count: ${processCount}, ` + logHMS());
    
  }