//object describing event and associated properties
export default class Event {
  constructor(
    description = null,
    state = null,
    action = null,
    trigger = null,
    time = null,
  ) {
    this.description = description;
    this.state = state;
    this.action = action;
    this.trigger = trigger;
    this.time = time;
  }
}
