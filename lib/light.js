import IOBase from "./IOBase.js";

import { Gpio } from 'onoff';
// import Gpio from 'onoff';


export default class Light extends IOBase {
    constructor(RCPin) {
        super();
        this.RCPin = RCPin;
        this.state = false;
        this.newStateFlag = true;
        this.RCLoopCount = 0;
        this.rcIO = Gpio.accessible  ? new Gpio(this.RCPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
    }

    turnOn() {
        this.setState(true);
    }

    turnOff() {
        this.setState(false);
    }
    getLightState() {
        // new ldr based routine test
        this.RCtime();  // Measure timing using GPIO4

        const lightState = (this.RCLoopCount > 1000) ? false : true;

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
        // console.log("===========rctime");

        this.RCloopCount = 0
        if (Gpio.accessible) {
            // Discharge capacitor
            // GPIO.setup(this.RCPin, GPIO.OUT)
            // GPIO.output(this.RCPin, GPIO.LOW)
            this.rcIO.setDirection('out');
            this.rcIO.writeSync(0)
            // console.log(`pre this.rcIO.readSync(): ${this.rcIO.readSync()}`);
            // time.sleep(0.1)  // give time for C to discharge
            console.log('Hello');
            var self = this;
            await setTimeout(1000);
            this.sleep(50).then(() => {
                
                // charge capacitor
                self.rcIO.setDirection('in');

                // Count loops until voltage across capacitor reads high on GPIO
                // console.log(`out self.rcIO.readSync(): ${self.rcIO.readSync()}`);
                while (self.rcIO.readSync() == 0 && self.RCloopCount < 999999) { 
                    self.RCloopCount += 1; 
                    // console.log(`self.rcIO.readSync(): ${self.rcIO.readSync()}`);
                }
                console.log(`LIVE-RCLoopCount: ${self.RCloopCount}`);
                

                console.log('World!');
            });
        } else {

            this.RCloopCount = 9999
            console.log(`DEMO-Gpio not accessible RCLoopCount: ${this.RCloopCount}`);
        }
        return this.RCloopCount
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    process() {
        //if
        this.getLightState();
        if (this.hasNewState() || 1) {
            if (this.getState()==true) {
                console.log("Light is on");
            } else {
                console.log("Light is off");
            }

            this.readAndClearNewState();
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
