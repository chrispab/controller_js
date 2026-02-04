Clean Reinstall (Recommended)
If the quick fix does not work, or if you encounter other "Cannot find module" errors, your node_modules tree is likely corrupted. A clean reinstall of all dependencies is the most reliable solution.

Run the following commands from the root of your controller_js directory:


bash
# Remove existing node_modules and lock files
cd controller_js
sudo systemctl stop zone_controller.service
sudo systemctl stop nextjs-frontend.service

rm -rf node_modules
rm -rf apps/frontend-nextjs/node_modules
rm -rf apps/controller/node_modules
rm package-lock.json

# Reinstall all dependencies
# Use increased memory limit (2GB) to prevent heap errors during install
NODE_OPTIONS=--max-old-space-size=2048 npm install
