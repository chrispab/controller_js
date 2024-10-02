//import classes
import Fan from "./fan.js";


// import TemperatureSensor from "./temperatureSensor.js";
import Heater from "./heater.js";

//create objects
const fan = new Fan();
// const temperatureSensor = new TemperatureSensor();
const heater = new Heater();

//set initial state
fan.setState(false);
heater.setState(false); //turn off by default

setInterval(() => {
    // console.log( Date.now());
    const date = new Date(Date.now());
    const hh = `0${date.getHours()}`.slice(-2);
    const mm = `0${date.getMinutes()}`.slice(-2);
    const ss = `0${date.getSeconds()}`.slice(-2);
    console.log(`${hh}:${mm}:${ss}`);


    fan.process();

    heater.process();

}, 1000);
