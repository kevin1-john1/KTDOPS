const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const FILE_PATH = "/usr/src/app/files/output.txt";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    let output = "Log output not available yet";

    if (fs.existsSync(FILE_PATH)) {
      output = fs.readFileSync(FILE_PATH, "utf8");
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${output}\n`);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Log output reader started in port ${PORT}`);
});