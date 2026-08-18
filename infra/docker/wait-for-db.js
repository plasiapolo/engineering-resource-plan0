const net = require("net");

const host = process.env.DB_HOST || "db";
const port = Number(process.env.DB_PORT || 5432);
const maxAttempts = Number(process.env.DB_WAIT_MAX_ATTEMPTS || 60);
let attempts = 0;

function tryConnect() {
  attempts += 1;
  const socket = net.connect({ host, port });
  socket.on("connect", () => {
    socket.destroy();
    console.log("Database is reachable.");
    process.exit(0);
  });
  socket.on("error", () => {
    socket.destroy();
    if (attempts >= maxAttempts) {
      console.error(`Could not reach ${host}:${port} after ${maxAttempts} attempts.`);
      process.exit(1);
    }
    setTimeout(tryConnect, 1500);
  });
}

tryConnect();