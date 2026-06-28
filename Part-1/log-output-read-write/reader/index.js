const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const LOG_FILE_PATH = "/usr/src/app/files/output.txt";
const PINGPONG_FILE_PATH = "/usr/src/app/files/pingpong.txt";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const logOutput = fs.existsSync(LOG_FILE_PATH)
      ? fs.readFileSync(LOG_FILE_PATH, "utf8")
      : "Log output not available yet";

    const pingPongs = fs.existsSync(PINGPONG_FILE_PATH)
      ? fs.readFileSync(PINGPONG_FILE_PATH, "utf8")
      : "0";

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