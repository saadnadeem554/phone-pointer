# Phone Pointer

This project allows a mobile device to act as a cursor and controller in browser-based interfaces. It uses gyroscope and touch input sent via OSC (Open Sound Control) from a mobile application to a Node.js server, which then broadcasts the data over WebSockets to client web pages.

## Project Structure

The project contains the following main files:

* phone-pointer/server.js: The Node.js server that handles the incoming OSC data and WebSocket broadcasting.
* phone-pointer/package.json: The project configuration and dependencies.
* phone-pointer/public/: Static HTML and Javascript files serving the web application.
  * display.html: A basic page showing a cursor moved by the mobile gyroscope.
  * game.html: A simple balloon popping game controlled by the mobile pointer.
  * shooter.html: A shooter style game interface where you point and tap to shoot.

## Requirements

* Node.js (v16 or higher recommended)
* A mobile device with an OSC-compatible sensor app installed, such as ZIG SIM.
* Both your computer and mobile device connected to the same local network.

## Server Setup

Navigate to the `phone-pointer` directory and run the server:

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

The server will listen for:
* Web clients on HTTP port 3000.
* OSC data on UDP port 9000.

## Mobile Application Configuration (using ZIG SIM)

To use your phone as a controller:

1. Open ZIG SIM on your mobile device.
2. Go to settings and configure the following connection options:
   * IP Address: Set this to the local IP address of the computer running the Node.js server. The server outputs candidate IP addresses in the console when started.
   * Port: 9000
   * Protocol: UDP
   * Message Format: OSC
3. In the sensor selection screen, enable the following:
   * Gyro (for controlling pointer coordinates)
   * 2D Touch (for tap and shoot actions)
4. Go back to the main screen in ZIG SIM and tap "START".
5. Tap on the screen of your mobile device to send shoot and click signals.

## Running the Web Applications

Once the server is running and ZIG SIM is streaming data, open any of the following URLs in your web browser:

* Pointer Demo: http://localhost:3000/display.html
* Balloon Game: http://localhost:3000/game.html
* Shooter Game: http://localhost:3000/shooter.html
