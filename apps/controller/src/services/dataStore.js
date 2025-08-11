
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import logger from './logger.js';
import { webSocketBroadcast } from './webSocketServer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultPath = resolve(__dirname, '../config/default.json');
const customPath = resolve(__dirname, '../config/custom_config.json');

class DataStore {
  #data; // Private field to hold the state object

  constructor() {
    // const defaultConfig = this.loadJson(defaultPath);
    const customConfig = this.loadJson(customPath);

    // const initialConfig = { ...defaultConfig, ...customConfig };

    this.#data = Object.freeze({
      config: customConfig,
      state: {
        lastChange: null,
        timeStamp: null,
      },
    });

    logger.info('DataStore initialized.');
  }

  loadJson(path) {
    if (fs.existsSync(path)) {
      try {
        const fileContent = fs.readFileSync(path);
        return JSON.parse(fileContent);
      } catch (error) {
        logger.error(`Error reading or parsing JSON at ${path}:`, error);
        return {};
      }
    }
    return {};
  }

  saveConfig() {
    try {
      fs.writeFileSync(customPath, JSON.stringify(this.#data.config, null, 2));
      logger.info('Configuration saved to custom_config.json');
    } catch (error) {
      logger.error('Error saving configuration:', error);
    }
  }

  get(path) {
    return this.getValueByPath(this.#data, path);
  }

  
  /**
   * Retrieves a value from the configuration using a dot-notation path and prepends the MQTT topic prefix.
   * @param {string} stringkey - The dot-notation path to the configuration property (e.g., 'mqtt.fanStateTopic').
   * @returns {string} The value of the configuration property with the MQTT topic prefix.
   * @throws {Error} If the key or the MQTT topic prefix does not exist in the configuration.
   */
  getWithMQTTPrefix(stringkey) {
    const value = this.get(`config.${stringkey}`);
    const prefix = this.get('config.mqtt.topicPrefix');
    if (value === undefined || prefix === undefined) {
      logger.log('error', 'config: ' + stringkey + ' does not exist');
      throw new Error(stringkey + ' does not exist');
    }
    return prefix + '/' + value;
  }


  set(path, value) {
    const pathArray = path.split('.');
    const topLevelKey = pathArray[0];

    if (topLevelKey !== 'config' && topLevelKey !== 'state') {
      logger.error(`Invalid top-level key: ${topLevelKey}. Must be 'config' or 'state'.`);
      return;
    }

    const oldState = this.#data;
    const newState = this.setValueByPath(oldState, path, value);

    this.#data = Object.freeze(newState);

    if (topLevelKey === 'config') {
      this.saveConfig();
    }

    logger.warn(`......datastore set() webSocketBroadcast  ..Data updated: ${path} = ${value}`);
    webSocketBroadcast(this.get('state'));
  }

  getValueByPath(obj, path) {
    const keys = path.split('.');
    let value = obj;

    for (let key of keys) {
      if (typeof value === 'object' && value !== null) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const newObj = JSON.parse(JSON.stringify(obj)); // Deep copy for immutability
    let current = newObj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return newObj;
  }
}

export const dataStore = new DataStore();
export default dataStore;
