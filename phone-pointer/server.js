const express = require('express');
const http = require('http');
const os = require('os');
const { WebSocketServer } = require('ws');
const osc = require('osc');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const displays = new Set();

wss.on('connection', (ws) => {
  displays.add(ws);
  console.log(`Display connected (${displays.size} total)`);
  ws.on('close', () => displays.delete(ws));
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of displays) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

// Zig Sim sends gyro at /(deviceUUID)/gyro with [x, y, z] rad/s.
// Phone held in portrait: pitch (tilt up/down) = x, roll (tilt left/right) = z.
const OSC_PORT = 9000;

const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: OSC_PORT,
});

const AXES = { x: 0, y: 1, z: 2 };
const DX_AXIS = 'z';
const DX_SIGN = 1;
const DY_AXIS = 'x';
const DY_SIGN = -1;

const DEADZONE_RAD_S = 0.02;

let lastTime = null;
let touchActive = false;
let lastTouchMsg = 0;
let lastShoot = 0;
const SHOOT_DEBOUNCE_MS = 100;
const TOUCH_RELEASE_MS = 250;

function tryShoot() {
  const now = Date.now();
  if (now - lastShoot < SHOOT_DEBOUNCE_MS) return;
  lastShoot = now;
  broadcast({ shoot: true });
  console.log('Shoot signal sent');
}

function markTouch() {
  const now = Date.now();
  if (!touchActive) tryShoot();
  touchActive = true;
  lastTouchMsg = now;
}

function handleTouchOsc(addr, args) {
  const a = addr.toLowerCase();

  if (a.endsWith('/touchcount')) {
    const count = Math.round(Number(args[0]) || 0);
    if (count === 0) {
      touchActive = false;
    } else {
      markTouch();
    }
    return true;
  }

  // touch0 with x,y in one message (older Zig Sim format)
  if (/\/touch\d+$/.test(a) && args.length >= 2) {
    markTouch();
    return true;
  }

  // touch01 = x, touch02 = y for first finger (newer format)
  if (/\/touch0?1$/.test(a) || /\/touch11$/.test(a)) {
    markTouch();
    return true;
  }

  // 3D touch / radius — often the first signal of a tap
  if (/\/touch(force|radius)\d+$/.test(a)) {
    const val = Number(args[0]) || 0;
    if (val > 0) markTouch();
    else touchActive = false;
    return true;
  }

  if (a.includes('touch')) {
    console.log('Unhandled touch OSC:', addr, args);
    return true;
  }

  return false;
}

setInterval(() => {
  if (touchActive && Date.now() - lastTouchMsg > TOUCH_RELEASE_MS) {
    touchActive = false;
  }
}, 50);

udpPort.on('message', (oscMsg) => {
  const addr = oscMsg.address;
  const args = oscMsg.args || [];

  if (handleTouchOsc(addr, args)) return;

  if (!addr.toLowerCase().endsWith('/gyro')) {
    if (process.env.DEBUG_OSC) console.log('OSC:', addr, args);
    return;
  }

  const raw = oscMsg.args;
  const now = Date.now();
  if (lastTime === null) { lastTime = now; return; }
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt <= 0 || dt > 0.5) dt = 1 / 60;

  let dx = raw[AXES[DX_AXIS]] * dt * DX_SIGN;
  let dy = raw[AXES[DY_AXIS]] * dt * DY_SIGN;
  if (Math.abs(dx) < DEADZONE_RAD_S * dt) dx = 0;
  if (Math.abs(dy) < DEADZONE_RAD_S * dt) dy = 0;

  broadcast({ dx, dy });
});

udpPort.on('ready', () => {
  const nets = os.networkInterfaces();
  const addresses = Object.values(nets).flat()
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

  console.log(`OSC/UDP listening on port ${OSC_PORT}`);
  console.log(`In Zig Sim, set IP Address to one of: ${addresses.join(', ')}`);
  console.log(`Set Port to ${OSC_PORT}, Protocol to UDP, Message Format to OSC.`);
  console.log(`Enable Gyro + 2D Touch sensors, then press Start.`);
  console.log(`Tap the Zig Sim app screen to shoot.`);
});

udpPort.open();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pointer:  http://localhost:${PORT}/display.html`);
  console.log(`Balloons: http://localhost:${PORT}/game.html`);
  console.log(`Shooter:  http://localhost:${PORT}/shooter.html`);
});
