const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT;
const TODO_BACKEND_URL = process.env.TODO_BACKEND_URL;
const IMAGE_URL = process.env.IMAGE_URL;
const CACHE_DIR = process.env.CACHE_DIR;
const IMAGE_PATH = process.env.IMAGE_PATH;
const META_PATH = process.env.META_PATH;
const IMAGE_CACHE_MS = Number(process.env.IMAGE_CACHE_MS);

const requiredConfig = {
  PORT,
  TODO_BACKEND_URL,
  IMAGE_URL,
  CACHE_DIR,
  IMAGE_PATH,
  META_PATH,
  IMAGE_CACHE_MS
};

for (const [key, value] of Object.entries(requiredConfig)) {
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }
}

fs.mkdirSync(CACHE_DIR, { recursive: true });

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const readMeta = () => {
  if (!fs.existsSync(META_PATH)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  } catch {
    return null;
  }
};

const imageIsFresh = () => {
  const meta = readMeta();

  if (!meta || !meta.createdAt || !fs.existsSync(IMAGE_PATH)) {
    return false;
  }

  return Date.now() - meta.createdAt < IMAGE_CACHE_MS;
};

const downloadImage = async () => {
  const response = await fetch(IMAGE_URL);

  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(IMAGE_PATH, buffer);
  fs.writeFileSync(META_PATH, JSON.stringify({ createdAt: Date.now() }));

  console.log("Downloaded new image");
};

const ensureImage = async () => {
  if (imageIsFresh()) {
    return;
  }

  try {
    await downloadImage();
  } catch (error) {
    console.error(error.message);

    if (!fs.existsSync(IMAGE_PATH)) {
      throw error;
    }
  }
};

const backendIsHealthy = async () => {
  const response = await fetch(`${TODO_BACKEND_URL}/healthz`);

  if (!response.ok) {
    throw new Error(`Backend unhealthy: ${response.status}`);
  }
};

const getTodos = async () => {
  const response = await fetch(`${TODO_BACKEND_URL}/todos`);

  if (!response.ok) {
    throw new Error(`Todo backend responded with ${response.status}`);
  }

  return response.json();
};

const createTodo = async (content) => {
  const response = await fetch(`${TODO_BACKEND_URL}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody);
  }
};

const updateTodoDone = async (id, done) => {
  const response = await fetch(`${TODO_BACKEND_URL}/todos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ done })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody);
  }

  return response.json();
};

const breakBackend = async () => {
  const response = await fetch(`${TODO_BACKEND_URL}/break`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Break request failed with status ${response.status}`);
  }
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderTodo = (todo) => {
  const id = todo.id;
  const content = todo.content || String(todo);
  const done = Boolean(todo.done);

  return `
    <li style="margin-bottom: 8px;">
      <span style="${done ? "text-decoration: line-through; color: gray;" : ""}">
        ${escapeHtml(content)}
      </span>
      ${
        id
          ? `
            <button
              type="button"
              onclick="markDone(${id}, ${done ? "false" : "true"})"
              style="margin-left: 8px;"
            >
              ${done ? "Undo" : "Mark done"}
            </button>
          `
          : ""
      }
    </li>
  `;
};

const renderHtml = (todos, errorMessage = "") => `
<!DOCTYPE html>
<html>
  <head>
    <title>Todo App</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 40px auto;
      }

      img {
        width: 100%;
        max-width: 600px;
        display: block;
        margin-bottom: 24px;
      }

      input {
        width: 320px;
        padding: 8px;
      }

      button {
        padding: 8px 12px;
        cursor: pointer;
      }

      .error {
        color: red;
      }

      .break-button {
        margin-top: 24px;
        background: #d9534f;
        color: white;
        border: none;
      }
    </style>
  </head>
  <body>
    <h1>Todo App</h1>

    <img src="/image.jpg" alt="Random image" />

    <form action="/todos" method="post">
      <input
        type="text"
        name="content"
        maxlength="140"
        placeholder="Write a todo"
        required
      />
      <button type="submit">Send</button>
    </form>

    ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ""}

    <h2>Todos</h2>
    <ul>
      ${todos.map(renderTodo).join("")}
    </ul>

    <form action="/break" method="post">
      <button class="break-button" type="submit">Break app</button>
    </form>

    <script>
      async function markDone(id, done) {
        await fetch('/todos/' + id, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ done: done })
        });

        window.location.reload();
      }
    </script>
  </body>
</html>
`;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/healthz") {
      try {
        await backendIsHealthy();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "unhealthy", error: error.message }));
      }

      return;
    }

    if (req.method === "GET" && req.url === "/") {
      await ensureImage();

      const todos = await getTodos();

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(renderHtml(todos));
      return;
    }

    if (req.method === "POST" && req.url === "/todos") {
      const body = await readRequestBody(req);
      const params = new URLSearchParams(body);
      const content = (params.get("content") || "").trim();

      if (!content || content.length > 140) {
        await ensureImage();
        const todos = await getTodos();

        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(renderHtml(todos, "Todo must be 1-140 characters long"));
        return;
      }

      await createTodo(content);

      res.writeHead(303, { Location: "/" });
      res.end();
      return;
    }

    const todoIdMatch = req.url.match(/^\/todos\/(\d+)$/);

    if (req.method === "PUT" && todoIdMatch) {
      const id = Number(todoIdMatch[1]);
      const body = await readRequestBody(req);

      let done = true;

      if (body) {
        try {
          const parsed = JSON.parse(body);
          done = typeof parsed.done === "boolean" ? parsed.done : true;
        } catch {
          done = true;
        }
      }

      const updatedTodo = await updateTodoDone(id, done);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(updatedTodo));
      return;
    }

    if (req.method === "POST" && req.url === "/break") {
      await breakBackend();

      res.writeHead(303, { Location: "/" });
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/image.jpg") {
      await ensureImage();

      res.writeHead(200, { "Content-Type": "image/jpeg" });
      fs.createReadStream(IMAGE_PATH).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found\n");
  } catch (error) {
    console.error(error.message);

    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error\n");
  }
});

server.listen(PORT, () => {
  console.log(`Todo app started in port ${PORT}`);
});