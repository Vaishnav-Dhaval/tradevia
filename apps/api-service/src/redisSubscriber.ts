import { redis } from "@tradevia/redis";

export const CALLBACK_QUEUE = "callback-queue";

export class RedisSubscriber {
  private client: typeof redis;
  private callbacks: Record<string, (data: Record<string, string>) => void>;

  constructor() {
    // Use a dedicated connection for blocking reads so the main
    // redis client stays free for xadd / other commands
    this.client = redis.duplicate();
    this.callbacks = {};

    this.client.on("error", (err) => {
      console.error("[SUBSCRIBER] Redis connection error:", err.message);
    });

    this.client.on("ready", () => {
      console.log("[SUBSCRIBER] Redis connection ready");
    });

    this.runLoop();
  }

  async runLoop() {
    console.log(`[SUBSCRIBER] Starting run loop`);
    // "$" = only read NEW messages arriving after this point
    // "0" would replay the entire stream history on every restart
    let lastId = "$";
    while (true) {
      try {
        const response = await this.client.xread(
          "BLOCK",
          0,
          "STREAMS",
          CALLBACK_QUEUE,
          lastId
        );
        if (!response || response.length === 0) continue;

        const [, messages] = response[0]!;
        if (!messages || messages.length === 0) continue;

        for (const [id, rawFields] of messages) {
          lastId = id;
          const fields = rawFields as string[];

          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2)
            data[fields[i]!] = fields[i + 1]!;

          const callbackId = data.id;
          console.log(`[SUBSCRIBER] Received callback:`, data);

          const fn = callbackId ? this.callbacks[callbackId] : undefined;
          if (fn) {
            fn(data);
            delete this.callbacks[callbackId!];
          } else {
            console.log(`[SUBSCRIBER] No waiter for id: ${callbackId}`);
          }
        }
      } catch (err) {
        console.error(`[SUBSCRIBER] xread error:`, err);
        // Brief pause before retrying to avoid tight error loop
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  waitForMessage(callbackId: string) {
    return new Promise<Record<string, string>>((resolve, reject) => {
      console.log(`[SUBSCRIBER] Waiting for callback id: ${callbackId}`);

      const timer = setTimeout(() => {
        if (this.callbacks[callbackId]) {
          delete this.callbacks[callbackId];
          reject(new Error("Timeout waiting for message"));
        }
      }, 15000);

      this.callbacks[callbackId] = (data: Record<string, string>) => {
        clearTimeout(timer);
        resolve(data);
      };
    });
  }
}
