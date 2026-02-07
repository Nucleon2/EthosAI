export const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"
export const NODE_ENV = process.env.NODE_ENV as "production" | "development"
export const DATABASE_URL = process.env["DATABASE_URL"]