private init():void {
    this.client = mqtt.connect(`mqtt://${process.env.BROKER_API}`, {
        will: {
            topic: "kfobdmsg/server/status",
            payload: "offline-unexpected",
            qos: 1,
            retain: true
        },
        clean: false,
        clientId: "kfobdmsg-server",
        username: process.env.BROKER_USERNAME,
        password: process.env.BROKER_PASSWORD
    });
    this.client.on("connect",()=>{
        console.log("Connected to broker!")
        this.client.publish("kfobdmsg/server/status", "online", {qos:1, retain:true});
    });
    this.client.on("error", (error:any) => {
        console.error("MQTT connection error:", error);
    });
}

public shutdown(complete: (result: boolean) => void): void {
    let success = true;
    console.log("Shutting down MQTT connection...");
    this.client.publish("kfobdmsg/server/status", "offline", {qos:1, retain:true}, (error:any)=>{
        if(error) {
            console.error("Error publishing offline message:", error);
            success = false;
        }
        console.log("Published offline message!");
        this.client.end(false, {
            reasonCode: 0,
            properties: {
                reasonString: "Server shutting down"
            }
        }, (error:any)=>{
            if(error) {
                console.error("Error disconnecting from broker:", error);
                success = false;
            }
            console.log("Disconnected from broker!");
            complete(success);
        });
    });
    
}
===================
const options = {
    clientId: clientId,
    keepalive: 60 , 
    will: {
      topic: topic + "Status",
      retain: 1,
      qos: 2,
      payload: "0|01"
    }
  }
  ==================================

  "use strict";

let mqtt = require("async-mqtt");

let options = {
  port: "15675",
  host: "ws://172.16.10.76",
  path: "/ws",
  clientId: "mqttjs_Eddy1_0117642a-c577-4323-bc98-4217a9f8f56f0.5591469928486372",
  keepalive: 60,
  reconnectPeriod: 1000,
  protocolId: "MQIsdp",
  protocolVersion: 3,
  clean: true,
  encoding: "utf8",
  username: "nltapp",
  password: "nltinc",
  will: {
    topic: "dm-chat/user/status/response/600",
    payload: "{\"userId\":6,\"status\":\"Away-LWT\",\"timeSent\":null}",
    qos: 1,
    retain: true
  }
};

console.log("connecting mqtt client");
let client = mqtt.connect("ws://172.16.10.76:15675/ws", options);
console.log(client);
client.on("error", function (err) {
  console.log(err);
  client.end();
});

client.on("connect", function () {
  console.log("client connected:" + options.clientId);
  client.subscribe("/a", { qos: 0 });
  client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  client.end();
});

client.on("message", function (topic, message, packet) {
  console.log("Received Message:= " + message.toString() + "\nOn topic:= " + topic);
});

client.on("close", function () {
  console.log(options.clientId + " disconnected");
});


Clearing ALL retained messages

    First we have to stop the mosquitto broker.

        sudo systemctl stop mosquitto.service
        or
        sudo service mosquitto stop

    Delete the mosquitto.db containing all the stored message data in the persistence. By default, located in /var/lib/mosquitto/mosquitto.db

        sudo rm /var/lib/mosquitto/mosquitto.db

    Restart the mosquitto service

        sudo systemctl start mosquitto.service
        or
        sudo service mosquitto start

