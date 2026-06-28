const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <head>
          <title>Todo App</title>
        </head>
        <body>
          <h1>Todo App</h1>
          <p>Hello from the DevOps with Kubernetes todo app!</p>
        </body>
      </html>
    `);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});