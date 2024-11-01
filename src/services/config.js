//additions to 'config'
//to support runtime adjusted configuration is written back to disk
//so it can be restored to last saved settings when app restarts
// import c from "config";
import config from "config";
// import logger from "./logger";
import logger from "./logger.js";

import fs from 'fs';

class ConfigHandler {
    constructor() {
        this.config = config;
    }

    save() {
        saveConfig();
    }

    get(key) {
        return this.config.get(key);
    }

    set(key, value) {
        // logger.log('error', 'setting - set config: ' + key + ' = ' + value);
        // this.config.set(key, value);
        //read config file
        // var fs = require('fs');
        // const fs = require('node:fs');
        // const fs 
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty

        // https://stackoverflow.com/questions/9454863/updating-javascript-object-property


        var file_content = fs.readFileSync("./config/default.json");
        var content = JSON.parse(file_content);

        const oldhisp = this.config.get("zone.highSetpoint");
        logger.log('error', 'oldhisp: ' + oldhisp);
        // fs.writeFileSync("./config/default2.json", JSON.stringify(mergedObj, null, 2));
        // logger.log('error', 'config: ' + JSON.stringify(content, null, 2));
        // https://stackoverflow.com/questions/65817636/update-nested-js-objects-without-overwriting-missing-properties
        const mergedObj = merge({ ...content }, { ...value })

        // fs.writeFileSync("./config/default2.json", JSON.stringify(mergedObj, null, 2));

        // now force a reload of config to get new values
        // this.config.
        // ...reset your environment variables...
        global.NODE_CONFIG = null;
        delete import.meta.config;
        // var config = require('config');
        // import config from "config";

        this.config = config;
        const newhisp = this.config.get("zone.highSetpoint");
        logger.log('error', 'newhisp: ' + newhisp);

        // ...test the new configs...
        // config
    }

    saveConfigzz() {
        var fs = require('fs');
        var file_content = fs.readFileSync("default.json");
        var content = JSON.parse(file_content);
        content.SERVER.port = 6000;
        fs.writeFileSync("default2.json", JSON.stringify(content));
    }


}

/**
 * Merges two objects, if the value is an object, merge the two objects.
 * https://stackoverflow.com/questions/65817636/update-nested-js-objects-without-overwriting-missing-properties
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns The merged object.
 */
const merge = (target, source) => {
    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) Object.assign(source[key], merge(target[key], source[key]))
    }
    // Join `target` and modified `source`
    Object.assign(target || {}, source)
    return target
}


// export a single instance of ConfigHandler;
export const cfg = new ConfigHandler();
export default cfg;
