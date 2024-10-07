import IOBase from "./IOBase.js";

import { Gpio } from 'onoff';
// import Gpio from 'onoff';


export default class Light extends IOBase {
    constructor(RCPin) {
        super();
        this.RCPin = RCPin;
        this.state = false;
        this.newStateFlag = true;
    }

    turnOn() {
        this.setState(true);
    }

    turnOff() {
        this.setState(false);
    }
    getLightState() {
        // new ldr based routine test
        let count = this.RCtime();  // Measure timing using GPIO4

        const lightState = (count > 1000) ? false : true;

        this.state = lightState
        return this.lightState
    }


    /**
     * RCtime() - Function to measure res-cap charge time
     *
     * 1. Discharge capacitor
     * 2. Set RC pin to hi impedance
     * 3. Count loops until voltage across capacitor reads high on GPIO
     * 4. Return measurement
     *
     * @return {Number} Measurement of time in milliseconds
     */
    RCtime() {
        console.log("===========rctime");
        // Discharge capacitor
        let measurement = 0
        if (Gpio.accessible) {
            // GPIO.setup(this.RCPin, GPIO.OUT)
            const rcpin = new Gpio(this.RCPin, 'out');

            // GPIO.output(this.RCPin, GPIO.LOW)
            rcpin.writeSync(0)

            time.sleep(0.1)  // give time for C to discharge

            // GPIO.setup(this.RCPin, GPIO.IN)  // set RC pin to hi impedance
            rcpin = new Gpio(this.RCPin, 'in');

            // Count loops until voltage across capacitor reads high on GPIO

            let measurement = 0;
            // while (GPIO.read(this.RCPin) === 0 && measurement < 9999) { measurement += 1; }
            while (rcpin.readSync() === 0 && measurement < 9999) { measurement += 1; }
        } else {
            console.log("Gpio not accessible");
        }
        return measurement
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
