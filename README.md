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

## Running as a System Service (systemd)

To ensure the application starts automatically on boot and runs reliably in the background, you can set it up as a `systemd` service.

1.  **Create a service file:**

    Create a new file named `zone_controller.service` in `/etc/systemd/system/` with the following content:

    ```
    [Unit]
    Description=Zone Controller Node.js Application
    After=network.target

    [Service]
    ExecStart=/usr/bin/sudo /home/pi/.nvm/versions/node/v22.17.0/bin/node /home/pi/controller_js/server/index.js
    WorkingDirectory=/home/pi/controller_js
    Restart=always
    User=pi
    Group=pi
    Environment=PATH=/usr/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games:/home/pi/.nvm/versions/node/v22.17.0/bin

    [Install]
    WantedBy=multi-user.target
    ```

    *   **Note:** Adjust `ExecStart` if your `npm` path is different or if you are not using `nvm`.
    *   **Note:** Ensure `WorkingDirectory` points to the absolute path of your project.

2.  **Reload systemd:**

    After creating or modifying the service file, reload the systemd daemon to recognize the new service:

    ```bash
    sudo systemctl daemon-reload
    ```

3.  **Enable the service:**

    Enable the service to start automatically on boot:

    ```bash
    sudo systemctl enable zone_controller.service
    ```

4.  **Start the service:**

    Start the service immediately:

    ```bash
    sudo systemctl start zone_controller.service
    ```

5.  **Stop the service:**

    Start the service immediately:

    ```bash
    sudo systemctl stop zone_controller.service
    ```

6.  **Check the service status:**

    To verify that the service is running correctly, check its status:

    ```bash
    sudo systemctl status zone_controller.service
    ```

    You can also view the logs:

    ```bash
    journalctl -u zone_controller.service -f
    ```
