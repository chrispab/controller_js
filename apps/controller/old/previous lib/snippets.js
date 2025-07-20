// var ventOnMsChangeEventHandler = function (state, mqttAgent) {
//   logger.log("warn", "MQTT->ventOnMsChangeEvent: " + `${state}`);
//   mqttAgent.client.publish(
//     cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic"),
//     `${state / 1000}`
//   );
// };

// var ventOffMsChangeEventHandler = function (state, mqttAgent) {
//   logger.log("warn", "MQTT->ventOffMsChangeEvent: " + `${state}`);
//   mqttAgent.client.publish(
//     cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic"),
//     `${state / 1000}`
//   );
// };

    // getPropertyValue(propertyName) {
    //   if (typeof this[propertyName] == "undefined")
    //     return this.emptyValue;
    //   else
    //     return this[propertyName];
    // }

    // setPropertyValue(propertyName, value) {
    //   this[propertyName] = value;
    // }
    const mod1Function = () => wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
          console.log(error);
        } else {
          logger.warn("UTILS-MOD1: currentConnections");
      
          // logger.warn(currentConnections);
          // console.warn(currentConnections);
      
          return currentConnections;
          /*
          // you may have several connections
          [
              {
                  iface: '...', // network interface used for the connection, not available on macOS
                  ssid: '...',
                  bssid: '...',
                  mac: '...', // equals to bssid (for retrocompatibility)
                  channel: <number>,
                  frequency: <number>, // in MHz
                  signal_level: <number>, // in dB
                  quality: <number>, // same as signal level but in %
                  security: '...' //
                  security_flags: '...' // encryption protocols (format currently depending of the OS)
                  mode: '...' // network mode like Infra (format currently depending of the OS)
              }
          ]
          */
        }
      });