import { config } from "@tradevia/config";
import Redis from "ioredis";

const redisOptions: import("ioredis").RedisOptions = {
    maxRetriesPerRequest: null, // null required for blocking commands (XREAD BLOCK 0)
    connectTimeout: 10000,
    retryStrategy(times) {
        if (times > 10) {
            console.error("[Redis] Max reconnection attempts reached, giving up");
            return null; // stop retrying
        }
        const delay = Math.min(times * 200, 3000);
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
    },
};

const redis = config.redis_url
    ? new Redis(config.redis_url, redisOptions)
    : new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        ...redisOptions,
    });

redis.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
});

redis.on("reconnecting", (ms: number) => {
    console.log(`[Redis] Reconnecting in ${ms}ms...`);
});

export { redis };
