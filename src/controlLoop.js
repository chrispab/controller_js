// src/controlLoop.js
//import classes
//inputs
import Light from "./components/light.js";
import TemperatureSensor from "./components/temperatureSensor.js";
//outputs
import Fan from "./components/fan.js";
import Heater from "./components/heater.js";
import Vent from "./components/vent.js";

//import services as single instances
import cfg from "./services/config.js";
import MqttAgent from './services/mqttAgent.js';

async function startControlLoop(broadcast) {
  const mqttAgent = new MqttAgent();
  await mqttAgent.initialize();
  //create components
  const fan = new Fan("fan", cfg.get("hardware.fan.pin"), mqttAgent);
  const heater = new Heater("heater", cfg.get("hardware.heater.pin"), mqttAgent);
  const light = new Light("light", cfg.get("hardware.RC.pin"), mqttAgent);
  const temperatureSensor = new TemperatureSensor("temperature_sensor", cfg.get("hardware.dhtSensor.pin"), mqttAgent);
  const vent = new Vent("vent", cfg.get("hardware.vent.pin"), cfg.get("hardware.vent.speedPin"), mqttAgent);

  setInterval(() => {
    cfg.process();

    temperatureSensor.process();
    let temperature = temperatureSensor.getTemperature();

    light.process();
    let lightState = light.getState();

    const setpoint = lightState == false ? cfg.get('zone.lowSetpoint') : cfg.get('zone.highSetpoint');

    vent.control(temperature, setpoint, lightState);
    vent.process();

    heater.control(temperature, setpoint, lightState, mqttAgent.outsideTemperature);
    heater.process();

    fan.control();
    fan.process();
    
    mqttAgent.setactiveSetpoint(setpoint);
    mqttAgent.process([vent, temperatureSensor, fan, heater, light]);

    const status = {
      fan: fan.getState(),
      vent: vent.getState(),
    };
    broadcast(status);

  }, 1000);
}

export { startControlLoop };
