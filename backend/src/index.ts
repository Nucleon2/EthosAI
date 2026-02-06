import { createApp } from "./app";

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT);

console.log(
  `🚀 Ethereum Wallet Market Analysis server is running at http://localhost:${PORT}`
);
console.log(`📍 Health check: http://localhost:${PORT}/api/ping`);
