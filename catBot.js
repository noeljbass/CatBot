const WebSocket = require('ws');
const { nip19, finalizeEvent } = require('nostr-tools/pure');
const { SimplePool, useWebSocketImplementation } = require('nostr-tools/pool');
const { bech32 } = require('bech32');
const axios = require('axios');

useWebSocketImplementation(WebSocket);

console.log({ nip19, finalizeEvent });

// Array of Nostr relay URLs
const relays = [
    'wss://relay.nostr.band',
    'wss://relay.primal.net',
    'wss://relay.damus.io',
    'wss://nostr.mom',
    'wss://nostr.oxtr.dev',
    'wss://nos.lol'
];

// Your provided npub and nsec
const npub = '000000000000000000000000000000000000000000000000000000000000000'; //Add your bot npub
const nsec = '000000000000000000000000000000000000000000000000000000000000000'; //Add your bot nsec

// Function to convert Bech32 to hex
function bech32ToHex(bech32Str) {
    const { prefix, words } = bech32.decode(bech32Str);
    const data = bech32.fromWords(words);
    return Buffer.from(data).toString('hex');
}

// Convert npub and nsec to hex
const privateKeyHex = bech32ToHex(nsec);
const publicKeyHex = bech32ToHex(npub);

// Create a SimplePool instance
const pool = new SimplePool();

// Function to fetch a cat fact
async function fetchCatFact() {
    const response = await axios.get('https://catfact.ninja/fact');
    return response.data.fact;
}

// Function to fetch a cat image
async function fetchCatImage() {
    const response = await axios.get('https://api.thecatapi.com/v1/images/search');
    return response.data[0].url;
}

// Function to send a cat fact and image to all relays
async function sendCatContent() {
    try {
        const catFact = await fetchCatFact();
        const catImage = await fetchCatImage();

        const content = `Cat Fact: ${catFact}\nCat Image: ${catImage}`;
        const event = {
            kind: 1, // Kind 1 is for text notes
            content: content,
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: publicKeyHex,
        };

        // Finalize the event (this will sign it)
        const signedEvent = finalizeEvent(event, privateKeyHex);

        // Iterate through each relay and try to publish
        for (const relay of relays) {
            try {
                await pool.publish([relay], signedEvent);
                console.log(`Sent cat content to relay: ${relay}`);
                return; // Exit the function after successfully sending to one relay
            } catch (error) {
                console.error(`Error publishing to ${relay}:`, error);
                // Continue to the next relay
            }
        }

        console.error("Failed to send cat content to all relays.");
    } catch (error) {
        console.error("Error fetching cat content:", error);
    }
}

// Function to handle graceful shutdown
function shutdown() {
    console.log("Shutting down the bot...");
    process.exit(0);
}

// Listen for termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Send cat content 20 minutes
const intervalId = setInterval(sendCatContent, 20 * 60 * 1000);
// Send the first cat content immediately
sendCatContent().catch(error => {
    console.error("Error sending the first cat content:", error);
});

// Optional: Clear the interval on shutdown
process.on('exit', () => {
    clearInterval(intervalId);
});