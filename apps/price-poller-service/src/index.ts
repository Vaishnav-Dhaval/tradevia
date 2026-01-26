import http from "http";
import { WebSocket } from "ws";
import { redis } from "@tradevia/redis";

const url = "wss://ws.backpack.exchange";
const ws = new WebSocket(url);

console.log("Starting Price Poller service on port 3003");

// Health check server
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "OK", timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(3003, () => console.log("Health check available at http://localhost:3003/health"));

redis.on("connect", () => {
  console.log("connected to redis");
});

redis.on("error", (err) => {
  console.log("error connecting to redis", err);
});

ws.on("open", () => {
  const subscribeMessage = {
    method: "SUBSCRIBE",
    params: ["bookTicker.BTC_USDC"],
    id: 1,
  };
  ws.send(JSON.stringify(subscribeMessage));
  // console.log("sent", subscribeMessage);
});

ws.on("message", async (message) => {
  try {
    const data = JSON.parse(message.toString());
    await redis.xadd(
      "engine-stream",
      "*",
      "data",
      JSON.stringify({ kind: "price-update", payload: data })
    );
    // console.log(data);
  } catch (e) {
    console.log(e);
  }
});
