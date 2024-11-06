import EventEmitter from "events";


class EmitterManager extends EventEmitter {
    constructor() {
        super();
    }
    trigger(handler,value) {
        this.emit(handler, value);
        console.log('emitter triggered');
    }
}

//export an instance so single instance can be used
export const emitterManager = new EmitterManager();
export default emitterManager; 
