import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = 32578171; // your API ID
const apiHash = "704b71ef30ad3fa125c382439b1322f6"; // your API Hash
const session = "1BVtsOGUBu10R5oTMLUeI1RGJ0UebKEbo-35xd7baNd8dFMY0KHYISdG8tB6LFo8mBZT75kE1WugqTPWgh1MRTP10AlPTHixCUOQZpEHCBFFZb4Vx0gOP_6EqaB1rCQN03YBtn1G6cuMLI3FKqj4zuVEuzDIcVxpsXzujoNqDGq862Rrts2VQL3fqdiFgjUbAn76EFnflonA4h5oAkUOJXxRDNd3Acw5mvf1zWjaCS4HsxaBm4SewuuLHzY3jpMRf7FmkAU4VRsfb6ITpDCGgKfKjEq_pK3G5Qe41HDJqHK6vlP8USRRT1oDab1CWU23cPUXN8WCbLk86g8pC6QFc6vA6h3FRjVg=";


const client = new TelegramClient(
  new StringSession(session),
  apiId,
  apiHash,
  {
    connectionRetries: Infinity,
    autoReconnect: true,
    useWSS: true,
    requestRetries: 5,
    timeout: 20,
  }
);

let connectInFlight = null;

function isTimeoutError(error) {
  const message = error?.message || "";
  return String(message).includes("TIMEOUT");
}

async function connectWithRetry(maxAttempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect();
      return;
    } catch (error) {
      lastError = error;
      const waitMs = attempt * 1000;
      console.error(
        `Telegram connect failed (attempt ${attempt}/${maxAttempts}):`,
        error?.message || error,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}

async function ensureTelegramConnected() {
  if (client.connected) {
    return;
  }

  if (!connectInFlight) {
    connectInFlight = connectWithRetry().finally(() => {
      connectInFlight = null;
    });
  }

  await connectInFlight;
}

async function connectTelegram() {
  // GramJS update loop emits frequent TIMEOUT ping errors on cloud platforms.
  // Keep real errors visible while silencing expected timeout noise.
  client.setLogLevel("none");

  client._errorHandler = async (error) => {
    if (isTimeoutError(error)) {
      return;
    }
    console.error("Telegram client error:", error?.message || error);
  };

  await ensureTelegramConnected();
  console.log("Telegram connected");
}

export { client, connectTelegram, ensureTelegramConnected };