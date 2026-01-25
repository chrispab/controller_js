// import { NanoPi_NEO3, Bias } from '../src';
import { RaspberryPi_3B } from 'opengpio';
import opengpio from 'opengpio';
// if (opengpio.mocked) {
//     console.log('opengpio is running with mocked bindings');
// }
const output = RaspberryPi_3B.output("GPIO26");

console.log("Output", output)

let value = false;
setInterval(() => {
    value = !value;
    console.log(`Setting value to ${value}.`);
    output.value = value;
    if (opengpio.mocked) {
    console.log('opengpio is running with mocked bindings');
}
}, 1000);