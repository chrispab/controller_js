
import logger from "./logger.js";
import fs from 'fs';


class ConfigHandler {
  constructor() {
    this.configHasChanged = false;
    this.configChangedTime = null;
    this.configChangedDelayBeforeSaveMs = 10000;

    this.config = this.load();
    logger.log('error', 'config: ' + JSON.stringify(this.config, null, 2));
  }

  process() {
    if (this.configHasChanged && Date.now() - this.configChangedTime > this.configChangedDelayBeforeSaveMs) {
      this.save();
      this.configHasChanged = false;
      this.configChangedTime = null;
    }
  }
  
  load() {
    // load default.json file as an object
    var file_content = null
    if (fs.existsSync("./config/custom_config.json")) {
      logger.log('error', 'custom_config.json exists');
      file_content = fs.readFileSync("./config/custom_config.json");
    }
    else {
      file_content = fs.readFileSync("./config/default.json");
      logger.log('error', 'custom_config.json does not exist. Using default.json');
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

  set(key, valueObj) {
    var currentConfig = this.config
    const mergedObj = fullMerge({ ...currentConfig }, { ...valueObj })
    this.config = mergedObj;
    this.configHasChanged = true;
    this.configChangedTime = new Date();
  }

  /**
   * Save the config object to the given path as a json file.
   * If path is not given, it defaults to "./config/custom_config.json".
   * @param {Object} configObj - The config object to save.
   * @param {String} [path] - The path to save the config to. Defaults to "./config/custom_config.json".
   */
  saveConfig(configObj, path = "./config/custom_config.json") {
    fs.writeFileSync(path, JSON.stringify(configObj, null, 2));
  }

}

/**
 * Merges two objects, if the value is an object, merge the two objects.
 * https://stackoverflow.com/questions/65817636/update-nested-js-objects-without-overwriting-missing-properties
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns The merged object.
 */
const fullMerge = (target, source) => {
  // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) Object.assign(source[key], fullMerge(target[key], source[key]))
  }
  // Join `target` and modified `source`
  Object.assign(target || {}, source)
  return target
}

// Helper function to access nested objects and arrays
function getValueByPath(obj, path) {
  const keys = path.split(".");
  let value = obj;

  for (let key of keys) {
    if (typeof value === "object" && value !== null) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}
// export a single instance of ConfigHandler;
export const cfg = new ConfigHandler();
export default cfg;
