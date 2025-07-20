import { Gpio } from 'onoff';
import logger from "../src/services/logger.js";
const logLevel = 'debug';

let turnOnOffMixin = {

  // turnOn() {
  //   this.setState(true);

  //   if (Gpio.accessible) {
  //     this.IOPin.writeIO(1);
  //   } else {
  //     logger.error('==' + this.getName() + ' IO undefined==')
  //   }
  //   if (this.emitIfStateChanged()) {
  //     logger.log('debug', '==' + this.getName() + ' IO on==')
  //   }
  // },

  // turnOff() {
  //   this.setState(false);

  //   if (Gpio.accessible) {
  //     this.IOPin.writeIO(0);
  //   } else {
  //     logger.error('==' + this.getName() + ' IO undefined==')
  //   }
  //   if (this.emitIfStateChanged()) {
  //     logger.log('debug', '==' + this.getName() + ' IO off==')
  //   }
  // }
};

export default turnOnOffMixin;