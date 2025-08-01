// apps/controller/src/services/stateManager.js
import { webSocketBroadcast } from './webSocketServer.js';
import logger from './logger.js';

class ImmutableStateManager {
  #status; // Private field to hold the state object

  constructor(initialStatus) {
    this.#status = Object.freeze(initialStatus); // Freeze the initial state
    logger.info('StateManager initialized.');
  }

  /**
   * Returns a frozen copy of the current state.
   * Freezing prevents any accidental mutations.
   */
  getState() {
    return this.#status;
  }

  /**
   * Updates one or more key-value pairs in the state.
   * This method is the only way to change the state.
   * @param {Object} updates - An object containing the key-value pairs to update.
   */
  update(updates) {
    const oldState = this.#status;
    let hasChanged = false;

    // Check if any of the new values are actually different
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key) && oldState[key] !== updates[key]) {
        hasChanged = true;
        break;
      }
    }

    if (!hasChanged) {
      return; // No changes detected, do nothing.
    }

    // Create a new state object by merging the old state with the updates
    const newState = Object.freeze({
      ...oldState,
      ...updates,
      timeStamp: Date.now(),
      lastChange: JSON.stringify(updates),
    });

    this.#status = newState;

    // Logging and broadcasting are now responsibilities of the manager
    logger.warn(`State updated: ${JSON.stringify(updates)}`);
    webSocketBroadcast(this.#status);
  }
}

export default ImmutableStateManager;
