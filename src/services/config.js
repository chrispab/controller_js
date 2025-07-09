import logger from './logger.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Construct absolute paths to the configuration files to avoid issues with the current working directory.
const defaultPath = resolve(__dirname, '../config/default.json');
const customPath = resolve(__dirname, '../config/custom_config.json');

class ConfigHandler {
  constructor() {
    this.configHasChanged = false;
    this.configChangedTime = null;
    this.configChangedDelayBeforeSaveMs = 10000;

    this.config = this.load();
    // logger.log('warn', 'config: ' + JSON.stringify(this.config, null, 2));
    logger.log('warn', 'config: loaded from file');

  }

  process() {
    if (this.configHasChanged && Date.now() - this.configChangedTime > this.configChangedDelayBeforeSaveMs) {
      this.save();
      this.configHasChanged = false;
      this.configChangedTime = null;
    }
  }

  load() {
    var file_content = null;
    if (fs.existsSync(customPath)) {
      logger.log('warn', `${customPath} exists`);
      file_content = fs.readFileSync(customPath);
    } else {
      file_content = fs.readFileSync(defaultPath);
      logger.log('warn', `${customPath} does not exist. Using ${defaultPath}`);
    }
    var content = JSON.parse(file_content);
    return content;
  }

  save() {
    this.saveConfig(this.config);
  }

  get(stringkey) {
    const name = getValueByPath(this.config, stringkey);
    if (name === undefined) {
      logger.log('error', 'config: ' + stringkey + ' does not exist');
      throw new Error(stringkey + ' does not exist');
    }
    return name;
  }
  getFull(stringkey) {
    const name = getValueByPath(this.config, stringkey);
    const prefix = getValueByPath(this.config, 'mqtt.topicPrefix');
    if (name === undefined || prefix === undefined) {
      logger.log('error', 'config: ' + stringkey + ' does not exist');
      throw new Error(stringkey + ' does not exist');
    }
    return prefix + name;
  }
  /**
   * Sets a value in the configuration using a dot-notation path.
   * @param {string} path - The path to the property (e.g., 'zone.highSetpoint').
   * @param {*} value - The value to set.
   */
  set(path, value) {
    setValueByPath(this.config, path, value);
    this.configHasChanged = true;
    this.configChangedTime = Date.now();
  }

  /**
   * Save the config object to the given path as a json file.
   * If path is not given, it defaults to "./config/custom_config.json".
   * @param {Object} configObj - The config object to save.
   * @param {String} [path] - The path to save the config to. Defaults to "./config/custom_config.json".
   */
  saveConfig(configObj, path = customPath) {
    fs.writeFileSync(path, JSON.stringify(configObj, null, 2));
  }
}

// Helper function to access nested objects and arrays
function getValueByPath(obj, path) {
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
// export a single instance of ConfigHandler;

/**
 * Sets a value in a nested object using a dot-notation path.
 * @param {Object} obj - The object to modify.
 * @param {String} path - The path to the property (e.g., 'a.b.c').
 * @param {*} value - The value to set.
 */
function setValueByPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Create a new object if it doesn't exist or is not an object
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}
export const cfg = new ConfigHandler();
export default cfg;
