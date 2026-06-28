const http = require("http");

const PORT = process.env.PORT || 8080;
const GREETING = process.env.GREETING || "hello";
const VERSION = process.env.VERSION || "v1";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${GREETING} from greeter ${VERSION}\n`);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Greeter ${VERSION} started in port ${PORT}`);
});