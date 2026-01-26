import dotenv from 'dotenv';

dotenv.config({ path: "../../.env" })


const msg = process.env.msg

export const config = {
    app_version: "1.0.0",
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    redis_url: process.env.REDIS_URL
}
