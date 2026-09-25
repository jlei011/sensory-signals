
/* =========================================
   COMPANION WEB APP - V3
   BLUETOOTH CONNECTION

   This code runs in the WEB BROWSER,
   not on the physical micro:bit.

   The technology notices.
   The person decides.
   ========================================= */


/* =========================================
   1. FIND THE HTML ELEMENTS
   ========================================= */

const statusCard =
  document.querySelector(".status-card");

const currentStatus =
  document.getElementById("current-status");

const receivedTime =
  document.getElementById("received-time");

const acknowledgementStatus =
  document.getElementById("acknowledgement-status");

const acknowledgeButton =
  document.getElementById("acknowledge-button");

const simulateOkButton =
  document.getElementById("simulate-ok");

const simulateBreakButton =
  document.getElementById("simulate-break");

const connectButton =
  document.getElementById("connect-microbit");

const connectionStatus =
  document.getElementById("connection-status");

  
const messageState =
  document.getElementById("message-state");

const historyList =
  document.getElementById("history-list");

const historyEmpty =
  document.getElementById("history-empty");


/* =========================================
   2. MESSAGE HISTORY AND DISPLAY
   ========================================= */

// Store messages during the current
// browser session.

let messageHistory = [];

// Keep track of the latest response.

let latestResponse = null;


// Format the time a message was received.

function formatTime(date) {

  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  });

}


// Return the main card to its waiting state.

function showWaitingState() {

  statusCard.classList.remove(
    "is-ok",
    "is-break"
  );

  messageState.textContent =
    "WAITING FOR A RESPONSE";

  currentStatus.textContent =
    "Waiting for a new response";

  receivedTime.textContent =
    "New responses will appear here.";

  acknowledgementStatus.textContent =
    "No new responses to view.";

  acknowledgeButton.disabled = true;

}


// Update the message history on screen.

function renderHistory() {

  // Remove the previous list items.

  historyList.replaceChildren();

  // Show the empty message if necessary.

  historyEmpty.hidden =
    messageHistory.length > 0;

  // Display newest messages first.

  messageHistory.forEach(function (entry) {

    const item =
      document.createElement("li");

    item.classList.add("history-item");

    // Format the response text.

    const responseText =
      entry.response === "OK"
        ? "I'm okay"
        : "I need a break";

    // Identify whether it was viewed.

    let viewStatus;

    if (entry.viewed) {

      viewStatus = "Viewed";

    } else {

      viewStatus = "Not viewed";

    }

    // Identify simulated responses.

    const sourceText =
      entry.source === "simulation"
        ? "Simulation - "
        : "";

    // Display the message.

    item.textContent =
      sourceText +
      responseText +
      " | Received " +
      entry.time +
      " | " +
      viewStatus;

    // Add the message to the history.

    historyList.appendChild(item);

  });

}


/* =========================================
   3. RECEIVE A WEARABLE RESPONSE
   ========================================= */

function receiveResponse(
  response,
  source = "wearable"
) {

  // Accept only recognised responses.

  if (
    response !== "OK" &&
    response !== "BREAK"
  ) {
    return;
  }

  // Record the time of this response.

  const now = new Date();

  const time = formatTime(now);

  // Create a new message record.

  const newMessage = {

    response: response,

    time: time,

    source: source,

    viewed: false

  };

  // Save the new message at the
  // beginning of the history.

  messageHistory.unshift(newMessage);

  // Keep track of the newest message.

  latestResponse = newMessage;

  // Clear previous status colours.

  statusCard.classList.remove(
    "is-ok",
    "is-break"
  );

  // Identify the new message.

  messageState.textContent =
    source === "simulation"
      ? "NEW TEST RESPONSE"
      : "NEW RESPONSE";

  // Update the current response.

  if (response === "OK") {

    currentStatus.textContent =
      "✓ I'm okay";

    statusCard.classList.add("is-ok");

  } else {

    currentStatus.textContent =
      "I need a break";

    statusCard.classList.add("is-break");

  }

  // Display the received time.

  receivedTime.textContent =
    "Received " + time;

  // Enable the viewed button.

  acknowledgementStatus.textContent =
    "New response received. " +
    "Mark as viewed when you have read it.";

  acknowledgeButton.disabled = false;

  // Update the message history.

  renderHistory();

}


/* =========================================
   4. TESTING CONTROLS
   ========================================= */

// Simulate I'M OKAY.

simulateOkButton.addEventListener(
  "click",
  function () {

    receiveResponse(
      "OK",
      "simulation"
    );

  }
);


// Simulate I NEED A BREAK.

simulateBreakButton.addEventListener(
  "click",
  function () {

    receiveResponse(
      "BREAK",
      "simulation"
    );

  }
);


/* =========================================
   5. MARK LATEST MESSAGE AS VIEWED
   ========================================= */

acknowledgeButton.addEventListener(
  "click",
  function () {

    // Do nothing if no message exists.

    if (!latestResponse) {
      return;
    }

    // Mark only the latest message
    // as viewed in the Companion App.

    latestResponse.viewed = true;

    // Update message history.

    renderHistory();

    // Return to waiting.

    showWaitingState();

  }
); 

/* =========================================
   6. BLUETOOTH UART SETTINGS
   ========================================= */

// Nordic UART service used by the micro:bit

const UART_SERVICE =
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

// TX characteristic:
// Messages sent FROM the micro:bit
// TO the browser

const UART_TX =
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e";


// Store the Bluetooth connection

let microbitDevice = null;

let uartCharacteristic = null;

let bluetoothConnected = false;

let isConnecting = false;


// Store incoming message fragments

let messageBuffer = "";

const decoder = new TextDecoder();


/* =========================================
   7. UPDATE THE CONNECTION INDICATOR
   ========================================= */

function updateConnection(message, state) {

  connectionStatus.textContent = message;

  connectionStatus.classList.remove(
    "is-connected",
    "is-error"
  );

  if (state === "connected") {

    connectionStatus.classList.add(
      "is-connected"
    );

  } else if (state === "error") {

    connectionStatus.classList.add(
      "is-error"
    );

  }

}


/* =========================================
   8. RESET THE BLUETOOTH CONNECTION
   ========================================= */

function resetBluetoothConnection() {

  bluetoothConnected = false;

  uartCharacteristic = null;

  messageBuffer = "";

  connectButton.disabled = false;

  connectButton.textContent =
    "Connect Bluetooth";

  updateConnection(
    "Bluetooth disconnected - previous responses may be outdated",
    "error"
  );

}


/* =========================================
   9. HANDLE BLUETOOTH DISCONNECTION
   ========================================= */

function handleBluetoothDisconnect() {

  console.log(
    "Micro:bit Bluetooth disconnected"
  );

  resetBluetoothConnection();

}


/* =========================================
   10. RECEIVE BLUETOOTH MESSAGES
   ========================================= */

function handleBluetoothData(event) {

  // Ignore messages if not connected

  if (!bluetoothConnected) {
    return;
  }

  // Get the incoming Bluetooth data

  const data = event.target.value;

  // Convert incoming bytes into text

  const messagePart = decoder.decode(data);

  // Add the new text to the message buffer

  messageBuffer += messagePart;

  // Process complete messages

  let newlinePosition;

  while (
    (newlinePosition =
      messageBuffer.indexOf("\n")) !== -1
  ) {

    // Extract one complete message

    const message = messageBuffer
      .slice(0, newlinePosition)
      .trim();

    // Keep any remaining incoming text

    messageBuffer = messageBuffer.slice(
      newlinePosition + 1
    );

    // Show the received message in the Console

    console.log(
      "Bluetooth received:",
      message
    );

    // Check for a valid wearable response

    if (
      message === "OK" ||
      message === "BREAK"
    ) {

      console.log(
        "Updating Companion App:",
        message
      );

      // Update the existing status card

      receiveResponse(message);

    } else if (message !== "") {

      // Ignore unexpected messages

      console.log(
        "Ignoring unrecognised message:",
        message
      );

    }

  }

  // Prevent the buffer from growing indefinitely

  if (messageBuffer.length > 1000) {

    console.warn(
      "Bluetooth message buffer cleared"
    );

    messageBuffer = "";

  }

}


/* =========================================
   11. CONNECT TO THE MICRO:BIT
   ========================================= */

// Set the initial connection display

connectButton.textContent =
  "Connect Bluetooth";

updateConnection(
  "Bluetooth not connected",
  "error"
);


// Connect when the button is clicked

connectButton.addEventListener(
  "click",
  async function () {

    // Prevent repeated connection attempts

    if (isConnecting || bluetoothConnected) {
      return;
    }

    // Check browser compatibility

    if (!("bluetooth" in navigator)) {

      updateConnection(
        "Web Bluetooth is not supported in this browser",
        "error"
      );

      return;
    }

    isConnecting = true;

    connectButton.disabled = true;

    connectButton.textContent =
      "Connecting...";

    try {

      // Ask the user to select the micro:bit

      microbitDevice =
        await navigator.bluetooth.requestDevice({

          filters: [
            {
              namePrefix: "BBC micro:bit"
            }
          ],

          optionalServices: [
            UART_SERVICE
          ]

        });

      console.log(
        "Bluetooth device selected:",
        microbitDevice.name
      );

      // Listen for disconnection events

      microbitDevice.addEventListener(
        "gattserverdisconnected",
        handleBluetoothDisconnect
      );

      // Establish the Bluetooth connection

      const server =
        await microbitDevice.gatt.connect();

      console.log(
        "Bluetooth GATT connection established"
      );

      // Access the micro:bit UART service

      const service =
        await server.getPrimaryService(
          UART_SERVICE
        );

      // Find the characteristic that
      // transmits data from the micro:bit

      uartCharacteristic =
        await service.getCharacteristic(
          UART_TX
        );

      // Listen for incoming Bluetooth data

      uartCharacteristic.addEventListener(
        "characteristicvaluechanged",
        handleBluetoothData
      );

      // Enable incoming message notifications

      await uartCharacteristic.startNotifications();

      // Clear previous incomplete messages

      messageBuffer = "";

      // Mark the connection as ready

      bluetoothConnected = true;

      updateConnection(
        "Micro:bit connected via Bluetooth",
        "connected"
      );

      connectButton.textContent =
        "Bluetooth connected";

      connectButton.disabled = true;

      console.log(
        "Companion App ready to receive Bluetooth messages"
      );

    } catch (error) {

      console.error(
        "Bluetooth connection error:",
        error
      );

      // Close any partially opened connection

      if (
        microbitDevice &&
        microbitDevice.gatt.connected
      ) {

        microbitDevice.gatt.disconnect();

      }

      resetBluetoothConnection();

    } finally {

      isConnecting = false;

      connectButton.disabled =
        bluetoothConnected;

    }

  }
);