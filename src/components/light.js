import IOBase from "./IOBase.js";

import { Gpio } from 'onoff';

// const logLevel = 'info';
const logLevel = 'debug';

import config from '../config/config.json' assert { type: 'json' };

import Logger from "../services/Logger.js";


var lightStateEventHandler = function (state, mqttAgent) {
    Logger.log('warn', 'PUBLISH Light: ' + `${state}`);
    mqttAgent.client.publish(config.mqtt.outTopic + "/light_state", `${state ? 1 : 0}`);
}
// wait(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export default class Light extends IOBase {
    constructor(RCPin, emitterManager, mqttAgent) {
        super(RCPin, 'out', 0);
        // this.setState(false); // this.state = false;
        this.setPrevStateChangeMillis(Date.now() - this.offMillis);

        // this.RCPin = RCPin;
        // this.state = false;
        // this.newStateFlag = true;
        this.RCLoopCount = 0;

        // this.rcIO = Gpio.accessible ? new Gpio(this.RCPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
        // this.rcIO.setDirection('out');
        // this.rcIO.writeSync(0)

        this.currentlySampling = false;

        this.mqttAgent = mqttAgent;
        this.emitterManager = emitterManager;
        this.emitterManager.on('lightStateChange', lightStateEventHandler);
        //set new reading available
        // this.setNewStateAvailable(true);
        this.processCount = 0;
        // this.lightIO = this.IO;
    }

    turnOn() {
        this.setState(true);
    }

    turnOff() {
        this.setState(false);
    }
    readLightState() {
        // console.log(`********this.RCLoopCount: ${this.RCLoopCount}`);

        // new ldr based routine test
        this.RCtime();  // Measure timing using GPIO4
        const lightState = (this.getState());
        // const lightState = (this.RCLoopCount > 1000) ? false : true;



        // console.log(`*********lightState: ${lightState}`);

        // this.state = lightState
        return this.setState(lightState)
    }



    /**
     * Measures the time it takes for the voltage across the capacitor to reach
     * a value readable by the GPIO. This is done by:
     * 1. Discharging the capacitor by setting the pin as an output and writing LOW.
     * 2. Waiting for 0.1s to give time for the capacitor to discharge.
     * 3. Setting the pin as an input and reading the voltage.
     * 4. Counting the number of loops until the voltage is read as HIGH.
     * 
     * @returns {number} The number of loops until the voltage is read as HIGH.
     */
    RCtime() {
        // console.log("==rctime");

        this.RCLoopCount = 0
        if (Gpio.accessible) {
            // Discharge capacitor
            // this.rcIO.setDirection('out');
            // this.rcIO.writeSync(0)
            // console.log('--Hello1');
            var self = this;
            // console.log(`1.....var self = this:${JSON.stringify(self)}`);

            wait(50)
                .then(() => this.sampleLDR(self))
                .catch(console.error);

        } else {
            this.RCLoopCount = 111
            console.log(`DEMO-Gpio not accessible RCLoopCount: ${this.RCLoopCount}`);
        }
        return this.RCLoopCount
    }

    // wait(ms) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }


    /**
     * Sample the LDR (Light Dependent Resistor) by discharging and recharging
     * the capacitor connected to the LDR and counting the number of loops
     * until the voltage across the capacitor reads high on the GPIO.
     *
     * If the count is greater than 1000, the state is set to false (dark).
     * Otherwise the state is set to true (light).
     *
     * The sampling is only performed if the currentlySampling flag is false.
     * This prevents multiple samples from being taken at the same time.
     */
    sampleLDR(self) {
        // console.log('---2');
        // Count loops until voltage across capacitor reads high on GPIO
        // console.log(`out self.rcIO.readSync(): ${self.rcIO.readSync()}`);
        // if not currently sampling then start counting
        // console.log(`2.....var self = this:${JSON.stringify(self)}`);
        if (self.currentlySampling == false) {
            self.currentlySampling = true
            // console.log('---3');
            // charge capacitor
            self.IO.setDirection('in');


            while (self.IO.readSync() == 0 && self.RCLoopCount < 999999) {
                self.RCLoopCount += 1;
                // console.log(`self.rcIO.readSync(): ${self.RCLoopCount}`);
            }
            self.setState(self.RCLoopCount > 1000 ? false : true);

            // discharge capacitor
            self.IO.setDirection('out');
            self.IO.writeSync(0)
            Logger.log(logLevel, `>>>>>self.getState(): ${self.getState()}`);

            Logger.log(logLevel, `>>>>>>>>>>>>>LIVE-self.RCLoopCount: ${self.RCLoopCount}`);
            // console.log(`>>>>>this.RCLoopCount: ${self.RCLoopCount}`);
            // console.log('World!');
            self.currentlySampling = false
        } else {
            console.log(`!!!!!!!currentlySampling: ${self.currentlySampling}`);
        }
    }

    process() {
        //if
        this.readLightState();
        if (this.hasNewStateAvailable()) {
            if (this.getState()) {
                console.log("Light is on");
            } else {
                console.log("Light is off");
            }

            this.getStateAndClearNewStateFlag();
            this.emitterManager.emit('lightStateChange', this.getState(), this.mqttAgent);

        }
    }

    checkAccessible() {
        if (Gpio.accessible) {
            led = new Gpio(17, 'out');
            // more real code here
        } else {
            // led = {
            //     writeSync: value => {
            //         console.log('virtual led now uses value: ' + value);
            //     }
            // };
        }
    }

}
