#!/bin/bash

# The IP of your router (usually 192.168.1.1 or 192.168.0.1)
SERVER=192.168.0.1

# Ping the router once. If it fails ($? != 0), restart the wifi
ping -c2 ${SERVER} > /dev/null

if [ $? != 0 ]
then
    echo "$(date): Wi-Fi connection down! Attempting reconnection..." >> /var/log/wifi_reconnect.log
    ifconfig wlan0 down
    sleep 5
    ifconfig wlan0 up
fi