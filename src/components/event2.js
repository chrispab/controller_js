//object describing event and associated properties
export default class Event2 {
    constructor(item=null, action=null, trigger=null, time=null) {
        this.item = item;
        this.action = action;
        this.trigger = trigger;
        this.time = time;
    }
}