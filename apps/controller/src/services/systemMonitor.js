import logger from './logger.js';
import * as utils from '../utils/utils.js';
import os from 'os';

// const MQTT_PUBLISH_INTERVAL = 30000; // 5 minutes
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const UPTIME_UPDATE_INTERVAL = 300000; // 5 minutes

class SystemMonitor {
  constructor(mqttAgent, stateManager) {
    this.mqttAgent = mqttAgent;
    this.stateManager = stateManager;
    this.mqttPublishTimer = null;
    this.healthCheckTimer = null;
    this.uptimeUpdateTimer = null;
  }

  start() {
    logger.warn('...........System Monitor starting...');

    // Start periodic MQTT publication of data
    // this.mqttPublishTimer = setInterval(() => this.publishMqttState(), MQTT_PUBLISH_INTERVAL);
    this.mqttPublishTimer = setInterval(() => this.publishMqttState(), this.mqttAgent.getPeriodicPublishIntervalMs());

    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => this.performHealthChecks(), HEALTH_CHECK_INTERVAL);

    // Start periodic uptime updates to the UI
    this.uptimeUpdateTimer = setInterval(() => this.updateUptime(), UPTIME_UPDATE_INTERVAL);

    logger.info('class SystemMonitor started.');
  }

  stop() {
    if (this.mqttPublishTimer) {
      clearInterval(this.mqttPublishTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.uptimeUpdateTimer) {
      clearInterval(this.uptimeUpdateTimer);
    }
    logger.info('System Monitor stopped.');
  }

  publishMqttState() {
    // const state = this.stateManager.getState();
    logger.warn('SystemMonitor.publishMqttState()................periodicPublication state via MQTT');
    // Example: Publishing heater status
    // this.mqttAgent.publish('greenhouse/heater/status', JSON.stringify({ isOn: state.heater.isOn }));
    // ... publish other key states
    //if fan.periodicPublishIntervalMs has passed since lat fan periodic publish mqtt then publish all
    //fan properties via mqtt
    this.mqttAgent.periodicPublication();
    
  }

  updateUptime() {
    try {
      const uptime = os.uptime();
      this.stateManager.update({ uptime });
    } catch (error) {
      logger.error(`Error updating uptime: ${error.message}`);
    }
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
