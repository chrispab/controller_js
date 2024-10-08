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

        this.state = lightState
        return this.lightState
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
        console.log("===========rctime");
        
        this.RCloopCount = 0
        if (Gpio.accessible) {
            // Discharge capacitor
            // GPIO.setup(this.RCPin, GPIO.OUT)
            const rcpin = new Gpio(this.RCPin, 'out');

            // GPIO.output(this.RCPin, GPIO.LOW)
            rcpin.writeSync(0)

            time.sleep(0.1)  // give time for C to discharge

            // charge capacitor
            // GPIO.setup(this.RCPin, GPIO.IN)  // set RC pin to hi impedance
            rcpin = new Gpio(this.RCPin, 'in');

            // Count loops until voltage across capacitor reads high on GPIO
            while (rcpin.readSync() === 0 && this.RCloopCount < 9999) { this.RCloopCount += 1; }
            console.log(`LIVE-RCLoopCount: ${this.RCloopCount}`);
        } else {
            
            this.RCloopCount= 9999
            console.log(`DEMO-Gpio not accessible RCLoopCount: ${this.RCloopCount}`);
        }
        return this.RCloopCount
    }


    process() {
        //if
        this.getLightState();
        if (this.hasNewState()) {
            if (this.getState()) {
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
