control(currentTemp, target_temp, lightState, currentMillis, outsideTemp) {
    // logger.log('warning', '==Heat ctl==');
    // Calculate new heater on time based on temperature gap
    // this.heatOnMs = ((target_temp - currentTemp) * 20 * 1000) + cfg.getItemValueFromConfig('heatOnMs');
    // logger.log('warning', '==Heat tdelta on:', this.heatOnMs);

    // Check for heater OFF hours // TODO: improve this
    // const currentHour = new Date().getHours();
    // if (cfg.getItemValueFromConfig('heat_off_hours').includes(currentHour)) { // l on and not hh:mm pm
    if (lightState === 'ON') {
        this.heaterState = 'OFF';
        // logger.log('warning', '..d on, in heat off hours - skipping lon heatctl');
    } else { // d off here
        // logger.log('warning', '..light off..do heatctl');
        // logger.log('warning', 'self.heatingCycleState:', this.heatingCycleState);
        if (currentTemp >= (target_temp + this.heater_sp_offset)) {
            if (this.heatingCycleState === 'INACTIVE') {
                this.heaterState = 'OFF';
            }
        }
        // Just trigger a defined ON period - force it to complete
        // Then force a defined OFF period - force it to complete
        // Is an on or off pulse active?
        if (currentTemp < (target_temp + this.heater_sp_offset)) {
            if (this.heatingCycleState === 'INACTIVE') {
                //! Look at on period based on external temp
                // Extra heater time based on difference from set point per 0.1 degree difference
                // let internalDiffT = Math.floor(((target_temp - currentTemp) * 10 * this.InternalTDiffMs));
                // logger.log('warning', '--INTERNAL DIFF extra time to add ms:', internalDiffT);

                // Extra heater time based on external temp difference
                // Do if external diff is >2 deg C
                if (outsideTemp === null) {
                    outsideTemp = 10;
                }
                // let externalDiffT = Math.floor((target_temp - 2 - outsideTemp) * this.ExternalTDiffMs);
                // Milliseconds per degree diff
                let externalDiffT = Math.floor((target_temp - outsideTemp) * this.ExternalTDiffMs);

                // logger.log('warning', '--EXTERNAL DIFF tdelta on to add ms:', externalDiffT);

                // this.heatOnMs = cfg.getItemValueFromConfig('heatOnMs') + internalDiffT + externalDiffT; // + (outsideTemp / 50);
                this.heatOnMs = cfg.getItemValueFromConfig('heatOnMs') + externalDiffT; // + (outsideTemp / 50);

                logger.log('warning', '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> CALCULATED TOTAL delta ON ms:', this.heatOnMs);

                // Start a cycle - ON first
                this.heatingCycleState = 'ON';
                // Init ON state timer
                this.lastStateChangeMillis = currentMillis;
                this.heaterState = 'ON';
                logger.log('warning', "..........temp low - currently INACTIVE - TURN HEATing cycle state ON");
            }
        }

        if (this.heatingCycleState === 'ON') {
            if ((currentMillis - this.lastStateChangeMillis) >= this.heatOnMs) {
                this.heatingCycleState = 'OFF';
                this.heaterState = 'OFF';
                this.lastStateChangeMillis = currentMillis;
                logger.log('warning', ".......... - currently ON - TURN HEATing cycle state OFF");
            }
        }

        if (this.heatingCycleState === 'OFF') {
            if ((currentMillis - this.lastStateChangeMillis) >= this.heatOffMs) {
                this.heatingCycleState = 'INACTIVE';
                logger.log('warning', ".......... - currently OFF - MAKE HEATing cycle state INACTIVE");
                this.heaterState = 'OFF';
                this.lastStateChangeMillis = currentMillis;
            }
        }
    }
}
