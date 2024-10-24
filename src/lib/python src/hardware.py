#!/usr/bin/env python
# hardware.py
# hardware specific for rpi platform
#for control.py for HVAC controller
#

# general im ports
from time import sleep
import datetime
from datetime import timedelta, time
#import sendemail as emailMe
import logging


logger = logging.getLogger(__name__)
#logger.basicConfig(level=logging.DEBUG)
#logging.basicConfig(level=logging.DEBUG)

from support import round_time as round_time
from support import delay as delay

from ConfigObject import cfg # singleton global


#******************** hardware specifics********************************
#================hardware dependant imports=============================
if cfg.getItemValueFromConfig('platform_name') == "RPi2": #rpi platform
    import RPi.GPIO as GPIO
    import Adafruit_DHT
    sensor = Adafruit_DHT.DHT22

elif cfg.getItemValueFromConfig('platform_name') == "PCDuino":    # pcduino platform
    import gpio
    import dht22 as dht22
    #=================hardware dependant pins values etc====================
    #Make sure the GPIO pins are ready:
    #GPIO.setmode(GPIO.BCM)
    #GPIO.setwarnings(False)
    #dht22.setup()               #init dht22 pins etc
    #----pin assignments----
    led1_pin = "gpio0"
    led2_pin = "gpio1"
    powerPin = "gpio2"
    relaypins = ("gpio3","gpio4","gpio5","gpio6")
    heaterRelay = "gpio3"
    ventRelay = "gpio4"
    fanRelay = "gpio5"
    relay4 = "gpio6"




#====================hardware dependant functions=======================

class sensor(object):

    def __init__(self):
        logger.info("create sensor object")
        if cfg.getItemValueFromConfig('platform_name') == "RPi2":
            
            self.sensorType = Adafruit_DHT.DHT22
            
            
        self.humidity = 50.0
        self.temperature = 21.0
        #self.prevTempHumiMillis = 0   #last time sensor read
        self.proc_temp = 0       # processed, filter temp reading
        self.currentTime = 0
        self.prevTemp = 0
        self.prevHumi = 0
        self.readErrs = 0

        self.platformName = cfg.getItemValueFromConfig('platform_name')
        self.delay= cfg.getItemValueFromConfig('readDelay')
        self.prevReadTime = datetime.datetime.now()
        self.powerPin = cfg.getItemValueFromConfig('powerPin')
        self.sensorPin = cfg.getItemValueFromConfig('sensorPin')

        self._power_cycle()
        
        self._prime_read_sensor()    # get temp, humi
        #self.sensorPin = 4
        
        self.safeModeTemp = 25	#temp to represent safe mode
        self.safeMode = True
        self.message = ""
        self.sensorMessage = ""
        self.maxSensorReadErrors = cfg.getItemValueFromConfig('maxSensorReadErrors')
        
        
        
    def _prime_read_sensor(self):
        self.readErrs = 0

        self.humidity, self.temperature = self._read_sensor()    # get temp, humi
    
        #repeat read until valid data or too many errorserror
        while (self.humidity is None or self.temperature is None) and self.readErrs < 5:
            logger.error("..ERROR TRYING TO READ SENSOR on PRIME sensor read")
            self.readErrs += 1

            #sleep(3) #wait before re-read
            self.humidity, self.temperature = self._read_sensor()    # get temp, humi again
            
            ##self.prevTempHumiMillis = self.currentMillis
            #self.temperature = round(self.temperature, 1)
            #self.humidity = round(self.humidity, 1)
            #logger.info("_rs temp: %s" % self.temperature)
            #logger.info("_rs humi: %s" % self.humidity)
            
        #self.prevTempHumiMillis = self.currentMillis
        
        #cope with faulty sensor. i.e readings are both NULL
        if (self.humidity is None or self.temperature is None):
            print (self.temperature)
            logger.error("FFFFFFFF Posssible faulty sensor detected - returning 0 values")
            #self.temperature = 99
            #self.humidity = 0    
            #enable safe state for controller ops
            #emulate high temp to enable safe mode
            self._enableSafeMode()
            
                
        
        self.temperature = round(self.temperature, 1)
        self.humidity = round(self.humidity, 1)
        logger.info("_rs temp: %s" % self.temperature)
        logger.info("_rs humi: %s" % self.humidity)
            
    def _enableSafeMode(self):
        #TODO safe mode should also put fan on full speed
        #self.temperature = 25 #self.safeModeTemp
        self.temperature = 25 #self.safeModeTemp
        self.safeMode = True	#enable safe mode
        self.humidity = 70
        #GPIO.setup(heaterRelay, GPIO.OUT)   #set pin as OP
        #GPIO.output(heaterRelay, 0)         #heat off        
        print (self.temperature)
        logger.error("FFFFFFFF Posssible faulty sensor detected - SAFE MODE ENABLED")        
        return        
                    
    
    # take a single sample, return values or NULL
    def _read_sensor(self):
        if self.platformName == "RPi2":
            #sensor = Adafruit_DHT.DHT22
            logger.info("in RPi2 _read_sensor about to read sensor")

            #self.humidity, self.temperature = Adafruit_DHT.read_retry(self.sensorType, self.sensorPin, 1,0)
            #store last good h and t
            oldHumidity = self.humidity
            oldTemperature = self.temperature

            self.humidity, self.temperature = Adafruit_DHT.read(self.sensorType, self.sensorPin)
            if self.humidity is None or self.temperature is None:
                 self.humidity = oldHumidity
                 self.temperature = oldTemperature
                 logger.warning("!!!! BAD SENSOR READ - USING OLD READINGS !!!!")

        elif self.platformName == "PCDuino":
            if dht22.getth() == 0:
                self.temperature = round(dht22.cvar.temperature, 1)
                self.humidity = round(dht22.cvar.humidity, 1)
            else:
                self.temperature = None
                self.humidity = None

        return self.humidity, self.temperature
        
        
        
        

    def read(self):
        #read till ret 0-ok. timeout if no valid data after timeout
        #global currentMillis        #current time

        logger.debug("...try to read sensor at: %s" % (datetime.datetime.now().strftime("%H:%M:%S")))
        self.readErrs = 0    #reset err count
        self.sensorMessage = ""   #reset err message
        
        
        #save previous values if reqd later
        self.prevTemp = self.temperature
        self.prevHumi = self.humidity
        
        #calc if 3 seconds passed - if not then  pass to allow other processing
        timeGap = datetime.datetime.now() - self.prevReadTime
        #print("Time Gap : %s" %timeGap)
        #sleep(cfg.getItemValueFromConfig('readDelay'))
        #timeToGo = timeGap < time.delta(seconds-3)
        if (timeGap < timedelta(seconds=self.delay)):
            logger.info("** JUMPING OUT OF AQUISITION -Too early to read sensor **")
            return self.humidity, self.temperature, self.sensorMessage

        logger.info("** AQUIring **")
        time1 = datetime.datetime.now()
        self.humidity, self.temperature = self._read_sensor()    # get temp, humi
        time2 = datetime.datetime.now()
        duration = time2 - time1
        print("->-")
        logger.info("TTTTTT - sensor read duration : %s" % (duration))
        
        
        #repeat read until valid data or too many errorserror
        #maxSensorReadErrors = 3
        while (self.humidity is None or self.temperature is None) and self.readErrs < self.maxSensorReadErrors:
            self.readErrs += 1
            logger.error("..ERROR READing SENSOR. Errors so far : %d" %self.readErrs)

            self.humidity, self.temperature = self._read_sensor()    # get temp, humi again
            logger.debug("readings %s, %s" % (self.temperature, self.humidity))

        #when here, means readings have vALS OR ARE null
        if self.readErrs == self.maxSensorReadErrors:  # powercyle if maxSensorReadErrors read errors, null READINGS
            logger.error("..%d sensor Max read errors logged" % self.maxSensorReadErrors)
            self._power_cycle()
            logger.error("..POWER CYCLE complete during sensor read")
            logger.error("..DODGY TEMP READING")
            if cfg.getItemValueFromConfig('emailEnabled') == True:
                zone = cfg.getItemValueFromConfig('zoneName')
                #TODO limit emails sent 
                self.message = 'Power cycling sensor due to too many,' + str(self.maxSensorReadErrors) + ', errors'
                try:
                    #emailMe.sendemail(zone + ': bad sensor reads ' + str(maxSensorReadErrors) + '  - PowerCycle', self.message)
                    self.sensorMessage = self.message
                except:
                    logger.error("...ERROR SENDING EMAIL - POWER CYCLE - DODGY READING - too many errors %d" % self.maxSensorReadErrors)
                                
            #emulate high temp to enable safe mode
            self._enableSafeMode()

        else:#good read CRC if here
            if self.temperature == self.safeModeTemp:
            #if self.safeMode == True	#enable safe op mode
                print("GOOD CRC BUT enable SAFE MODE")
            #check for whacky readings compared to last - i.e reading glitch
            elif ( abs(self.temperature - self.prevTemp) < 10) and ( (self.humidity >= 0)
                and (self.humidity <= 100)) : #if temp diff smallish, assume good sample
                #print( "..read sensor SUCCESS" )
                logger.info("..read sensor success at: %s" % (datetime.datetime.now().strftime("%H:%M:%S")))
                
                self.prevReadTime = datetime.datetime.now()
                logger.info("Prev read time: %s" % self.prevReadTime)
                
                #self.prevTempHumiMillis = self.currentMillis
                self.temperature = round(self.temperature, 1)
                self.humidity = round(self.humidity, 1)

                logger.warning('Temp: %2.1f, Humi: %2.1f' %(self.temperature, self.humidity))

            else:
                #bad sample even though good crc
                logger.error('..temp: %2.1f, proc_temp: %2.1f, humi: %2.1f' %(self.temperature, self.proc_temp, self.humidity))
                logger.error('..DODGY TEMP READING USING - OLD VALS---------------- ')
                
                #TODO limit emails sent 

                if cfg.getItemValueFromConfig('emailEnabled') == True:
                    self.message = 'Readings, Temp = '+ str(self.temperature) + ',  Humi = '+ str(self.humidity)
                    try:
                        #emailMe.sendemail(zone + 'Spike in Reading', self.message)
                        self.sensorMessage = self.message

                    except:

                        logger.error("ERROR SENDING EMAIL - DODGY READING")
                self.temperature = self.prevTemp  #restore prev sample readings
                self.humidity = self.prevHumi
        
        return self.humidity, self.temperature, self.sensorMessage
           
         
    def _power_cycle(self):
            logger.warning("entering power cycle")

            if cfg.getItemValueFromConfig('platform_name') == "RPi2":
                GPIO.setup(self.powerPin, GPIO.OUT)  #set pin as OP
                GPIO.output(self.powerPin, GPIO.LOW)        #set low to power off sensor
                logger.warning("sensor power cycle - power off")
                sleep(3)
                GPIO.output(self.powerPin, GPIO.HIGH)        #hi to power on sensor
                logger.warning("sensor power cycle - Power back ON")
                sleep(1)   
                             
            elif cfg.getItemValueFromConfig('platform_name') == "PCDuino":
                gpio.pinMode(self.powerPin, gpio.OUTPUT)
                gpio.digitalWrite(self.powerPin, gpio.LOW)   #power off
                sleep(1.0 * 3000 / 1000)
                gpio.digitalWrite(self.powerPin, gpio.HIGH)  #power on
                sleep(1.0 * 3000 / 1000)
        
        
class platform(object):
    def __init__(self):
        logger.info('creating platform board')
        #Make sure the GPIO pins are ready:
        if cfg.getItemValueFromConfig('platform_name') == "RPi2":
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
        elif cfg.getItemValueFromConfig('platform_name') == "PCDuino":
            dht22.setup()               #init dht22 pins etc
            
        # get pin definitions from config object
        self.heaterRelay = cfg.getItemValueFromConfig('heaterRelay')
        self.ventRelay= cfg.getItemValueFromConfig('ventRelay')
        self.fanRelay = cfg.getItemValueFromConfig('fanRelay')
        self.relay4 = cfg.getItemValueFromConfig('relay4')     
        
    #=================hardware dependant pins values etc====================
    #----pin assignments and related hardware defs----
        self.led2 = cfg.getItemValueFromConfig('led2')    

        self.alivePin = cfg.getItemValueFromConfig('alivePin')
        self.watchDogPin = cfg.getItemValueFromConfig('watchDogPin')           
        
        self._setupIO_pins()
        pass
        
    def _setupIO_pins(self):
        logger.info('initialising io pins')
        if cfg.getItemValueFromConfig('platform_name') == "RPi2":
            GPIO.setup(self.heaterRelay, GPIO.OUT)   #set pin as OP
            GPIO.output(self.heaterRelay, 0)         #heat off
            GPIO.setup(self.ventRelay, GPIO.OUT)     #set pin as OP
            GPIO.output(self.ventRelay, 1)           #vent on
            GPIO.setup(self.fanRelay, GPIO.OUT)      #set pin as OP
            GPIO.output(self.fanRelay, 1)            #fan on
            GPIO.setup(self.relay4, GPIO.OUT)        #set pin as OP
            GPIO.output(self.relay4, 0)              #speed low
            
            GPIO.setup(self.alivePin, GPIO.OUT)        #set pin as OP
            GPIO.output(self.alivePin, 1)              #signal alive to io board
            
            GPIO.setup(self.watchDogPin, GPIO.OUT)        #set pin as OP
            GPIO.output(self.watchDogPin, 1)              #signal alive to io board
            
        elif cfg.getItemValueFromConfig('platform_name') == "PCDuino":
            for portpin in relaypins:
                gpio.pinMode(portpin, gpio.OUTPUT)    #
            for portpin in relaypins:
                gpio.digitalWrite(portpin, gpio.HIGH)    #turn off all relays        
        
    def switch_relays(self, heaterState, ventState, fanState, ventSpeedState):
		#check if in safe mode
		#if sensor.getSafeMode() 
        #print('....fan switch state', fanState)
        if cfg.getItemValueFromConfig('platform_name') == "RPi2":
            GPIO.output(self.heaterRelay, heaterState)
            GPIO.output(self.ventRelay, ventState)
            GPIO.output(self.fanRelay, fanState)
            GPIO.output(self.relay4, ventSpeedState)
        elif cfg.getItemValueFromConfig('platform_name') == "PCDuino":
            #print 'switch relays'
            gpio.digitalWrite(heaterRelay, heaterState)
            gpio.digitalWrite(ventRelay, ventState)
            gpio.digitalWrite(fanRelay, fanState)
            gpio.digitalWrite(relay4, ventSpeedState)

#******************end of hardware specific*****************************
