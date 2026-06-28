const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const randomString = crypto.randomUUID();

const getStatus = () => `${new Date().toISOString()}: ${randomString}`;

console.log("Log output application started");
console.log(`Generated string: ${randomString}`);

setInterval(() => {
  console.log(getStatus());
}, 5000);

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${getStatus()}\n`);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});