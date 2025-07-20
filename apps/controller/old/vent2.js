class Vent {
    constructor() {
        this.ventState = OFF;
        this.speed_state = OFF;
        this.speed_state_count = 0;
        this.speed_state_trigger = 5;  // trigger hi state on n counts hi
        this.prev_vent_millis = 0;  // last time vent state updated
        this.vent_on_delta = cfg.getItemValueFromConfig('ventOnDelta');  // vent on time
        this.vent_off_delta = cfg.getItemValueFromConfig('ventOffDelta');  // vent off time
        this.vent_pulse_active = OFF;  // settings.ventPulseActive
        this.vent_pulse_delta = 0;  // ventPulseDelta
        this.vent_pulse_on_delta = cfg.getItemValueFromConfig('ventOverridePulseOnDelta');
        this.vent_loff_sp_offset = cfg.getItemValueFromConfig('vent_loff_sp_offset');
        this.vent_lon_sp_offset = cfg.getItemValueFromConfig('vent_lon_sp_offset');
        this.ventDisableTemp = cfg.getItemValueFromConfig('ventDisableTemp');
        this.ventDisableHumi = cfg.getItemValueFromConfig('ventDisableHumi');
        this.platformName = cfg.getItemValueFromConfig('hardware');
        this.vent_override = OFF;  // settings.ventOverride
        this.ventEnableHighSpeed = cfg.getItemValueFromConfig('ventEnableHighSpeed');

        this.ventDark_status = 'inactive';
        this.ventDarkOnDelta = cfg.getItemValueFromConfig('ventDarkOnDelta');  // vent on time
        this.ventDarkOffDelta = cfg.getItemValueFromConfig('ventDarkOffDelta');  // vent on time
        this.ventDark_ON_startTime = 0;
        this.ventDark_OFF_startTime = 0;
    }

    control(currentTemp, currentHumi, target_temp, lightState, current_millis) {
        // refresh in case changed while running
        this.vent_on_delta = cfg.getItemValueFromConfig('ventOnDelta');  // vent on time
        this.vent_off_delta = cfg.getItemValueFromConfig('ventOffDelta');  // vent off time
        this.ventDarkOnDelta = cfg.getItemValueFromConfig('ventDarkOnDelta');  // vent on time
        this.ventDarkOffDelta = cfg.getItemValueFromConfig('ventDarkOffDelta');  // vent on time

        // loff vent/cooling

        // if light off - do a minimal vent routine
        if (lightState == OFF) {
            // this.ventState = OFF;
            // this.speed_state = OFF;
            if (this.ventDark_status == 'inactive') {
                logger.warn('lets start the vent dark ON period');
                // lets start the vent dark ON period
                this.ventDark_status = ON;
                this.ventState = ON;
                this.speed_state = OFF;
                // set time it was switched ON
                this.ventDark_ON_startTime = current_millis;
                return;
            }

            // if at end of ON period
            if ((this.ventDark_status == ON) && (current_millis > (this.ventDark_ON_startTime + this.ventDarkOnDelta))) {
                logger.warn('# now at end of ON cylce');
                // now at end of ON cylce
                // enable off period
                this.ventDark_status = OFF;
                this.ventState = OFF;
                this.speed_state = OFF;
                // set time it was switched ON
                this.ventDark_OFF_startTime = current_millis;
                return;
            }

            // if at end of OFF period
            if ((this.ventDark_status == OFF) && (current_millis > (this.ventDark_OFF_startTime + this.ventDarkOffDelta))) {
                logger.warn('now at end of OFF cylce');
                // now at end of OFF cylce
                // so - enable ON period
                this.ventDark_status = ON;
                this.ventState = ON;
                this.speed_state = OFF;
                // set time it was switched ON
                this.ventDark_ON_startTime = current_millis;
                return;
            }
            return;
        } else {  // mark light off period as inactive
            logger.info('turn off all vent - in dark off settings');
            this.ventDark_status = 'inactive';
        }


        // force hispeed if over temp and lon
        //!add some hysteresys here
        // only for upperlon control
        if (lightState == ON) {
            lowerHys = target_temp - 0.1;
            upperHys = target_temp + 0.2;
            // maybe use a dead band?

            if (this.speed_state == ON) {
                if (currentTemp > lowerHys) {
                    this.speed_state = ON;  // high speed - leave on
                } else {  // (currentTemp < lowerHys):
                    this.speed_state = OFF;  // lo speed
                }
            } else {  // speedstate is OFF
                if (currentTemp < upperHys) {
                    this.speed_state = OFF;  // high speed - leave on
                } else {  // (currentTemp > upperHys):
                    this.speed_state = ON;  // lo speed
                }
            }

            if ((lightState == ON) && (currentTemp > target_temp + this.vent_lon_sp_offset)) {
                this.vent_override = ON;
                this.ventState = ON;
                this.prev_vent_millis = current_millis;  // retrigeer time period
                logger.info(
                    "..VENT ON - HI TEMP OVERRIDE - (Re)Triggering cooling pulse")
            }
            // temp below target, change state to OFF after pulse delay
            else if ((this.vent_override == ON) && ((current_millis - this.prev_vent_millis) >= this.vent_pulse_on_delta)) {
                this.ventState = OFF;
                this.vent_override = OFF;
                this.prev_vent_millis = current_millis;
                logger.info("..VENT OFF - temp ok, OVERRIDE - OFF")
            } else if (this.vent_override == ON) {
                logger.info('..Vent on - override in progress')
            }

            // periodic vent control - only execute if vent ovveride not active
            if (this.vent_override == OFF) {  // process periodic vent activity
                if (this.ventState == OFF) {  // if the vent is off, we must wait for the interval to expire before turning it on
                    // iftime is up, so change the state to ON
                    if (current_millis - this.prev_vent_millis >= this.vent_off_delta) {
                        this.ventState = ON;
                        logger.warn("VVVVVVVVVVVV..VENT ON cycle period start")
                        this.prev_vent_millis = current_millis;
                    } else {
                        logger.info('..Vent off - during cycle OFF period')
                    }
                } else {
                    // vent is on, we must wait for the 'on' duration to expire before
                    // turning it off
                    // time up, change state to OFF
                    if ((current_millis - this.prev_vent_millis) >= this.vent_on_delta) {
                        this.ventState = OFF;
                        logger.warn("VVVVVVVVVVVVV..VENT OFF cycle period start")
                        this.prev_vent_millis = current_millis;
                    } else {
                        logger.info('..Vent on - during cycle ON period')
                    }
                }
            }
        }

    }
}
