import logger from './logger.js';
import * as utils from '../utils/utils.js';

// const MQTT_PUBLISH_INTERVAL = 30000; // 5 minutes
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

class SystemMonitor {
  constructor(mqttAgent, stateManager) {
    this.mqttAgent = mqttAgent;
    this.stateManager = stateManager;
    this.mqttPublishTimer = null;
    this.healthCheckTimer = null;
  }

  start() {
    logger.warn('...........System Monitor starting...');

    // Start periodic MQTT publication of data
    // this.mqttPublishTimer = setInterval(() => this.publishMqttState(), MQTT_PUBLISH_INTERVAL);
    this.mqttPublishTimer = setInterval(() => this.publishMqttState(), this.mqttAgent.getPeriodicPublishIntervalMs());

    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => this.performHealthChecks(), HEALTH_CHECK_INTERVAL);

    logger.info('class SystemMonitor started.');
  }

  stop() {
    if (this.mqttPublishTimer) {
      clearInterval(this.mqttPublishTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    logger.info('System Monitor stopped.');
  }

  publishMqttState() {
    const state = this.stateManager.getState();
    logger.warn('SystemMonitor.publishMqttState()................periodicPublication state via MQTT');
    // Example: Publishing heater status
    // this.mqttAgent.publish('greenhouse/heater/status', JSON.stringify({ isOn: state.heater.isOn }));
    // ... publish other key states
    //if fan.periodicPublishIntervalMs has passed since lat fan periodic publish mqtt then publish all
    //fan properties via mqtt
    this.mqttAgent.periodicPublication();
    
  }

  performHealthChecks() {
    logger.info('Performing system health checks...');
    // Add logic to check sensor connectivity, etc.
    const memoryUsage = process.memoryUsage();
    logger.info(`Memory Usage: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  }

    sendStartupEmail() {
      utils.sendEmail(this.zoneName + ' startup', 'zone startup');
    }
}

export default SystemMonitor;
