const http = require("http");

const PORT = process.env.PORT || 3000;

let counter = 0;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/pingpong") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`pong ${counter}\n`);
    counter += 1;
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Ping-pong app started in port ${PORT}`);
});