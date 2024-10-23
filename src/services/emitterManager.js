import EventEmitter from "events";

export default class EmitterManager extends EventEmitter {
    constructor() {
        super();
        // this.supply = supply;
    }
    trigger(handler,value) {
        // this.supply--;
        this.emit(handler, value);
        console.log('emitter triggered');
    }
}

// module.exports = TicketManager