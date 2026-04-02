#!/bin/bash

# The IP of your router (usually 192.168.1.1 or 192.168.0.1)
SERVER=192.168.0.1

# Ping the router once. If it fails ($? != 0), restart the wifi
ping -c2 ${SERVER} > /dev/null

if [ $? != 0 ]
then
    echo "$(date): Wi-Fi down! Restarting.pi.." >> /var/log/wifi_reboot.log
	sudo /sbin/shutdown -r now
fi
