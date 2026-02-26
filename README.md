# Zone Controller

This project contains the software for controlling and monitoring a greenhouse environment. It consists of a Node.js backend controller and a Next.js frontend.

## Features

- **Temperature-based control:** The controller reads from a temperature sensor and manages a heater, fan, and vent to maintain desired temperature setpoints.
- **Day/Night Setpoints:** Different temperature setpoints can be configured for when the lights are on or off.
- **MQTT Integration:** The application uses MQTT to publish sensor data and device states, and to receive commands.
- **Web Server:** An Express server provides a simple API and serves a test page.
- **WebSocket Server:** A WebSocket server broadcasts the real-time status of the fan and vent to connected clients.

## Project Structure

This project is a monorepo using npm workspaces.

```
controller_js/
├── apps/
│   ├── controller/         # The main Node.js controller application
│   └── frontend-nextjs/    # The Next.js frontend application
├── libs/
│   ├── shared-types/       # Shared TypeScript types
│   └── shared-utils/       # Shared utility functions
├── package.json            # Root package.json with workspace configuration
└── README.md               # This file
```

## Installation
on a fresh sd card

install raspbian lite latest

install webmin
https://webmin.com/download/

install nfs-server

install nodejs
https://raspberrytips.com/node-js-raspberry-pi/

```bash
sudo apt update
sudo apt install nodejs

sudo apt install npm
```

https://nodejs.org/en/download


**Grant hardware permissions to the user (replace 'chris' with your username if different)**
```bash
sudo usermod -a -G gpio,i2c chris
```
1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    ```

2.  **Install dependencies:**

    From the root directory, install all dependencies for all workspaces:
    ```bash
    npm install
    ```



To start the application, run the following command:

```bash
cd apps/controller

npm start
```

## Development Workflow

To run the applications, use the `npm run` commands from the root directory.

1.  **Start the Controller Backend:**

    ```bash
    npm run start:controller
    ```
    This will start the Node.js server for the controller on port `5678`.

2.  **Start the Frontend Dev Server:**

    ```bash
    npm run dev:frontend
    ```
    This will start the Next.js development server, typically on port `3000`.

### Running Tests

To run the tests for the controller application:
```bash
npm test --workspace=@greenhouse-project/controller
```

### Linting and Formatting

To check the code against the style guidelines and automatically fix issues:
```bash
# Run ESLint
npm run lint

# Run Prettier to format files
npm run prettier
```

## Running as a System Service (systemd)

To ensure the application starts automatically on boot and runs reliably in the background, you can set it up as a `systemd` service.

1. **Create a service file:**

   Create a new file named `zone_controller.service` in `/etc/systemd/system/` with the following content:

   ````
   [Unit]
   Description=Zone Controller Node.js Application
   After=network.target

   [Service]
   WorkingDirectory=/home/chris/controller_js/apps/controller
   ExecStart=node src/server/index.js
   Restart=always
   RestartSec=10
   User=chris
   Group=chris

   [Install]
   WantedBy=multi-user.target

   ````


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

restart
    ```bash
    sudo systemctl restart zone_controller.service
    ```


    You can also view the logs:

    ```bash
    journalctl -u zone_controller.service -f
    ```

### Runs with the default 'info' level

```bash
sudo systemctl stop zone_controller.service
cd controller_js/apps/controller
npm start
````

### Runs with 'debug' level, showing info, warn, error, AND debug messages

LOG_LEVEL=debug npm start

pi@zone1:~/controller_js $ npm run dev --workspace=apps/frontend-nextjs

## Autostarting the Next.js dev Frontend Server on Raspberry Pi (systemd)

To ensure your Next.js server starts automatically on boot and runs reliably in the background, you can set it up as a `systemd` service.

1. **Create a systemd service file**:

   Create a new file, for example, `/etc/systemd/system/nextjs-frontend.service`, with the following content:

```

[Unit]
Description=Next.js Frontend Application
After=network.target

[Service]
User=chris
WorkingDirectory=/home/chris/controller_js/apps/frontend-nextjs
ExecStart=/usr/bin/npm run dev
Restart=always
Environment=NODE_ENV=development

[Install]
WantedBy=multi-user.target

````

    *   **Note:** Adjust `WorkingDirectory` to the absolute path of your Next.js application's root directory.
    *   **Note:** If you are building your Next.js application for production, you might want to change `ExecStart` to `ExecStart=/usr/bin/npm run start` after running `npm run build`.

2.  **Reload systemd**:

    After creating or modifying the service file, reload the systemd daemon to recognize the new service:

    ```bash
    sudo systemctl daemon-reload
    ```

3.  **Enable the service**:

    Enable the service to start automatically on boot:

    ```bash
    sudo systemctl enable nextjs-frontend.service
    ```

4.  **Start the service**:

    Start the service immediately:

    ```bash
    sudo systemctl start nextjs-frontend.service
    ```

5.  **Check the service status**:

    To verify that the service is running correctly, check its status:

    ```bash
    sudo systemctl status nextjs-frontend.service
    ```

    You can also view the logs:

    ```bash
    journalctl -u nextjs-frontend.service -f
    ```

cd apps/frontend-nextjs && npm run dev
````

npm run lint
npm run prettier



