const http = require("http");
const { Pool } = require("pg");

const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;
const INITIAL_TODOS = process.env.INITIAL_TODOS;

if (!PORT) {
  throw new Error("Missing required configuration: PORT");
}

if (!DATABASE_URL) {
  throw new Error("Missing required configuration: DATABASE_URL");
}

const pool = new Pool({
  connectionString: DATABASE_URL
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseInitialTodos = () => {
  try {
    return INITIAL_TODOS ? JSON.parse(INITIAL_TODOS) : [];
  } catch {
    return [];
  }
};

const initializeDatabase = async () => {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const countResult = await pool.query("SELECT COUNT(*) FROM todos");
      const count = Number(countResult.rows[0].count);

      if (count === 0) {
        const initialTodos = parseInitialTodos();

        for (const todo of initialTodos) {
          await pool.query("INSERT INTO todos (content) VALUES ($1)", [todo]);
        }
      }

      console.log("Todo database initialized");
      return;
    } catch (error) {
      console.error(
        `Database initialization failed, attempt ${attempt}/${maxAttempts}:`,
        error.message
      );

      await sleep(2000);
    }
  }

  throw new Error("Could not initialize todo database");
};

const initialized = initializeDatabase();

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

const getTodos = async () => {
  const result = await pool.query(`
    SELECT id, content
    FROM todos
    ORDER BY id ASC
  `);

  return result.rows;
};

const createTodo = async (content) => {
  const result = await pool.query(
    "INSERT INTO todos (content) VALUES ($1) RETURNING id, content",
    [content]
  );

  return result.rows[0];
};

const server = http.createServer(async (req, res) => {
  try {
    await initialized;

    if (req.method === "GET" && req.url === "/todos") {
      const todos = await getTodos();
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

      const todo = await createTodo(content);
      sendJson(res, 201, todo);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error.message);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Todo backend started in port ${PORT}`);
});