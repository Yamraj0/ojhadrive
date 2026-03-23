import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = 32578171; // your API ID
const apiHash = "704b71ef30ad3fa125c382439b1322f6"; // your API Hash
const session = "1BVtsOGUBu10R5oTMLUeI1RGJ0UebKEbo-35xd7baNd8dFMY0KHYISdG8tB6LFo8mBZT75kE1WugqTPWgh1MRTP10AlPTHixCUOQZpEHCBFFZb4Vx0gOP_6EqaB1rCQN03YBtn1G6cuMLI3FKqj4zuVEuzDIcVxpsXzujoNqDGq862Rrts2VQL3fqdiFgjUbAn76EFnflonA4h5oAkUOJXxRDNd3Acw5mvf1zWjaCS4HsxaBm4SewuuLHzY3jpMRf7FmkAU4VRsfb6ITpDCGgKfKjEq_pK3G5Qe41HDJqHK6vlP8USRRT1oDab1CWU23cPUXN8WCbLk86g8pC6QFc6vA6h3FRjVg=";


const client = new TelegramClient(
  new StringSession(session),
  apiId,
  apiHash,
  { connectionRetries: 5 }
);

async function connectTelegram() {
  await client.connect();
  console.log("Telegram connected");
}

export { client, connectTelegram };