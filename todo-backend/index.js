const http = require("http");

const PORT = process.env.PORT;
const INITIAL_TODOS = process.env.INITIAL_TODOS;

if (!PORT) {
  throw new Error("Missing required configuration: PORT");
}

let todos = [];

try {
  todos = INITIAL_TODOS ? JSON.parse(INITIAL_TODOS) : [];
} catch {
  todos = [];
}

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/todos") {
    sendJson(res, 200, todos);
    return;
  }

  if (req.method === "POST" && req.url === "/todos") {
    const body = await readRequestBody(req);

    let content = "";

    try {
      const parsed = JSON.parse(body);
      content = parsed.content || "";
    } catch {
      const params = new URLSearchParams(body);
      content = params.get("content") || "";
    }

    content = content.trim();

    if (!content) {
      sendJson(res, 400, { error: "Todo content is required" });
      return;
    }

    if (content.length > 140) {
      sendJson(res, 400, { error: "Todo must be 140 characters or less" });
      return;
    }

    todos.push(content);
    sendJson(res, 201, { content });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Todo backend started in port ${PORT}`);
});