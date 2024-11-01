//additions to 'config'
//to support runtime adjusted configuration is written back to disk
//so it can be restored to last saved settings when app restarts
// import c from "config";
import config from "config";
// import logger from "./logger";
import logger from "./logger.js";

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
        logger.log('error', 'setting - set config: ' + key + ' = ' + value);
        // this.config.set(key, value);
    }

    saveConfig() {
        var fs = require('fs');
        var file_content = fs.readFileSync("default.json");
        var content = JSON.parse(file_content);
        content.SERVER.port = 6000;
        fs.writeFileSync("default2.json", JSON.stringify(content));
    }
    
    
}

// export a single instance of ConfigHandler;
export  const cfg = new ConfigHandler();
export default cfg;
