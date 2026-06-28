const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const LOG_FILE_PATH = "/usr/src/app/files/output.txt";
const PING_PONG_URL = process.env.PING_PONG_URL || "http://ping-pong-svc:2345/pings";

const getPingPongs = async () => {
  try {
    const response = await fetch(PING_PONG_URL);

    if (!response.ok) {
      throw new Error(`Ping-pong responded with ${response.status}`);
    }

    return (await response.text()).trim();
  } catch (error) {
    console.error("Could not fetch ping-pong count:", error.message);
    return "N/A";
  }
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const logOutput = fs.existsSync(LOG_FILE_PATH)
      ? fs.readFileSync(LOG_FILE_PATH, "utf8")
      : "Log output not available yet";

    const pingPongs = await getPingPongs();

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${logOutput}.\nPing / Pongs: ${pingPongs}\n`);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Log output reader started in port ${PORT}`);
});