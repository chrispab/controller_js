// server/index.js
import express from 'express';
import http from 'http';
import process from 'process';
import { startWebSocketServer, broadcast } from './webSocketServer.js';
import { startControlLoop } from '../src/controlLoop.js';

// const PORT = process.env.PORT || 3001;
const PORT = process.env.PORT || 8081;

const app = express();
app.use(express.static('client/public'));
const server = http.createServer(app);

startWebSocketServer(server);

app.get('/api', (req, res) => {
  res.json({ message: "This is the API" });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

await startControlLoop(broadcast);