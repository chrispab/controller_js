# Zone Controller

This Node.js application is designed to control and monitor a greenhouse or other enclosed environment. It manages a fan, a vent, a heater, and a light based on temperature readings and a configurable setpoint. The application also provides a web interface with a WebSocket server to broadcast the real-time status of the fan and vent.

## Features

*   **Temperature-based control:** The application reads from a temperature sensor and controls a heater, fan, and vent to maintain a desired temperature range.
*   **Day/Night Setpoints:** Different temperature setpoints can be configured for when the lights are on or off.
*   **MQTT Integration:** The application uses MQTT to publish sensor data and device states, and to receive commands.
*   **Web Server:** An Express server provides a simple API and serves a test page.
*   **WebSocket Server:** A WebSocket server broadcasts the real-time status of the fan and vent to connected clients.

## Project Structure

```
controller_js/
├── client/                 # Frontend application (not fully implemented)
│   └── public/
│       └── websocket_test.html # A simple page to test the WebSocket server
├── server/
│   ├── index.js            # Main entry point of the application
│   └── webSocketServer.js  # WebSocket server implementation
├── src/
│   ├── components/         # Hardware components (fan, heater, etc.)
│   ├── config/             # Configuration files
│   ├── services/           # Services like MQTT, logging, etc.
│   └── controlLoop.js      # Core control logic for the application
├── package.json            # Project dependencies and scripts
└── README.md               # This file
```

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## Usage

To start the application, run the following command:

```bash
npm start
```

This will start the main control loop, the Express server, and the WebSocket server.

### Testing the WebSocket Server

1.  Start the application.
2.  Open your browser and navigate to `http://<your-raspberry-pi-ip-address>:8081/websocket_test.html`.

This page will display the real-time status of the fan and vent.
