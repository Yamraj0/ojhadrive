import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = 32578171; // your API ID
const apiHash = "704b71ef30ad3fa125c382439b1322f6"; // your API Hash
const session = "1BQANOTEuMTA4LjU2LjExMwG7w/XTgzuXUz+fN9TxRaSGifoiu3HsMUu5jCcO0waXYlRFtA+aGt3/GTjwrYb7WPzTDRMCIIsnC3nBJQZOdYM7QluuJY+03sNK6PClEQbM+713xxn90a19lGMC4ai0Vzd5NA8U2KCXJyCuXXDv8o2cDd5ZKOYgRhQ+OCzIQWoE5jAxZNDCxoDi82x3wtcpjUyNTZwlgiKv2pWOsIQ0P0rjsfijQ933YnPS7a5iiKOdfHg0eqNXTeqCD5ebOzs1gBh4bgZMuJvSnMp9RHchOhseQ+e9dqXw5Yzker934KAcUdS9HfT5+ULR1xwXZo5e3Z3h9UACD1jRACn5mUTOp6jjRg=="; // your session string, you can get it by running the TelegramClient and saving the session after logging in   


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