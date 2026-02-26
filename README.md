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
On a fresh SD card:

1. Install the latest Raspberry Pi OS Lite.
2. Install Webmin: https://webmin.com/download/
3. Install NFS server.
4. Install Node.js.

Reference: https://raspberrytips.com/node-js-raspberry-pi/

```bash
sudo apt update
sudo apt install nodejs

sudo apt install npm
```

Alternative installer reference: https://nodejs.org/en/download

Use one Node.js installation method consistently (APT or NodeSource/nodejs.org). Avoid mixing methods.

5. Grant hardware permissions to the user (replace `chris` with your username if different):
```bash
sudo usermod -a -G gpio,i2c chris
```
6. Clone the repository:

```bash
git clone <repository-url>
```

7. Install dependencies from the repo root:
```bash
npm install
```

## Required Local Config

Before first run, make sure these files exist:

1. Zone selector file: `apps/controller/src/config/zoneInfo.js`
2. Zone config file referenced by `zoneInfo.configFileName` (for example `zone3_config.json`)
3. Secrets file: `apps/controller/src/secret.js`

Bootstrap from examples:

```bash
cp apps/controller/src/config/zoneInfo_example.js apps/controller/src/config/zoneInfo.js
cp apps/controller/src/secret_example.js apps/controller/src/secret.js
```

Notes:
- `zoneInfo.js` chooses which config JSON to load via `configFileName`.
- If that custom config file is missing, the app falls back to `apps/controller/src/config/default.json`.
- `secret.js` is used for email credentials; do not commit real credentials.
- This repo already ignores `apps/controller/src/secret.js` and `apps/controller/src/config/zoneInfo.js` via `.gitignore`.

Optional `.gitignore` additions for machine-local config files:

```gitignore
# Optional: ignore local zone config variants if you do not want them versioned
apps/controller/src/config/*_config.local.json
apps/controller/src/config/custom_config.json
```

After running `sudo usermod -a -G gpio,i2c <username>`, log out/in (or reboot) so group changes take effect.



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

   ```ini
   [Unit]
   Description=Zone Controller Node.js Application
   After=network.target

   [Service]
   WorkingDirectory=/home/chris/controller_js/apps/controller
   ExecStart=/usr/bin/node src/server/index.js
   Restart=always
   RestartSec=10
   User=chris
   Group=chris

   [Install]
   WantedBy=multi-user.target

   ```

   Note: Confirm your Node binary path with `which node` and update `ExecStart` if needed.


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

    Stop the service immediately:

    ```bash
    sudo systemctl stop zone_controller.service
    ```

6.  **Check the service status:**

    To verify that the service is running correctly, check its status:

    ```bash
    sudo systemctl status zone_controller.service
    ```

7.  **Restart the service:**
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
```

### Run with debug log level

```bash
cd controller_js/apps/controller
LOG_LEVEL=debug npm start
```

### Run frontend dev server manually

```bash
npm run dev:frontend
```

## Autostarting the Next.js dev Frontend Server on Raspberry Pi (systemd)

To ensure your Next.js server starts automatically on boot and runs reliably in the background, you can set it up as a `systemd` service.

1. **Create a systemd service file**:

   Create a new file, for example, `/etc/systemd/system/nextjs-frontend.service`, with the following content:

```ini

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

```

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

## Useful root commands

```bash
npm run dev:frontend
npm run lint
npm run prettier
```
