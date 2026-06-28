const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const FILE_PATH = "/usr/src/app/files/pingpong.txt";

fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });

const readCounter = () => {
  if (!fs.existsSync(FILE_PATH)) {
    return 0;
  }

  const value = Number(fs.readFileSync(FILE_PATH, "utf8"));
  return Number.isNaN(value) ? 0 : value;
};

const writeCounter = (value) => {
  fs.writeFileSync(FILE_PATH, String(value));
};

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/pingpong") {
    const counter = readCounter();

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`pong ${counter}\n`);

    writeCounter(counter + 1);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Ping-pong app started in port ${PORT}`);
});