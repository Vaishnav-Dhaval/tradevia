import { config } from "@tradevia/config";
import Redis from "ioredis";

const redis = config.redis_url
    ? new Redis(config.redis_url)
    : new Redis({
        host: process.env.REDIS_HOST || "redis",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD,
    });


export { redis };
