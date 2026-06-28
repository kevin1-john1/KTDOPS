const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "/usr/src/app/files/output.txt";
const INFORMATION_FILE_PATH =
  process.env.INFORMATION_FILE_PATH || "/usr/src/app/config/information.txt";
const MESSAGE = process.env.MESSAGE || "";
const PING_PONG_URL = process.env.PING_PONG_URL || "http://ping-pong-svc:2345/pings";

const fetchPingPongs = async () => {
  const response = await fetch(PING_PONG_URL);

  if (!response.ok) {
    throw new Error(`Ping-pong responded with ${response.status}`);
  }

  return (await response.text()).trim();
};

const getPingPongs = async () => {
  try {
    return await fetchPingPongs();
  } catch (error) {
    console.error("Could not fetch ping-pong count:", error.message);
    return "N/A";
  }
};

const readFileContent = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return fs.readFileSync(filePath, "utf8").trim();
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    try {
      await fetchPingPongs();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "unhealthy", error: error.message }));
    }

    return;
  }

  if (req.method === "GET" && req.url === "/") {
    const information = readFileContent(
      INFORMATION_FILE_PATH,
      "information.txt not available"
    );

    const logOutput = readFileContent(
      LOG_FILE_PATH,
      "Log output not available yet"
    );

    const pingPongs = await getPingPongs();

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(
      `file content: ${information}\n` +
        `env variable: MESSAGE=${MESSAGE}\n` +
        `${logOutput}.\n` +
        `Ping / Pongs: ${pingPongs}\n`
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Log output reader started in port ${PORT}`);
});