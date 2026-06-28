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

let isHealthy = true;

const log = (event, data = {}) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "todo-backend",
      event,
      ...data
    })
  );
};

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
          done BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        ALTER TABLE todos
        ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT FALSE
      `);

      const countResult = await pool.query("SELECT COUNT(*) FROM todos");
      const count = Number(countResult.rows[0].count);

      if (count === 0) {
        const initialTodos = parseInitialTodos();

        for (const todo of initialTodos) {
          await pool.query(
            "INSERT INTO todos (content, done) VALUES ($1, false)",
            [todo]
          );
        }
      }

      log("database_initialized");
      return;
    } catch (error) {
      log("database_initialization_failed", {
        attempt,
        maxAttempts,
        error: error.message
      });

      await sleep(2000);
    }
  }

  throw new Error("Could not initialize todo database");
};

const initialized = initializeDatabase();

const databaseIsReady = async () => {
  await pool.query("SELECT 1");
};

const healthCheck = async () => {
  if (!isHealthy) {
    throw new Error("Application was manually broken");
  }

  await databaseIsReady();
};

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

const parseTodoContent = (body) => {
  try {
    const parsed = JSON.parse(body);
    return parsed.content || "";
  } catch {
    const params = new URLSearchParams(body);
    return params.get("content") || "";
  }
};

const parseDoneValue = (body) => {
  if (!body) {
    return true;
  }

  try {
    const parsed = JSON.parse(body);

    if (typeof parsed.done === "boolean") {
      return parsed.done;
    }

    return true;
  } catch {
    const params = new URLSearchParams(body);
    const done = params.get("done");

    if (done === "false") {
      return false;
    }

    return true;
  }
};

const getTodos = async () => {
  const result = await pool.query(`
    SELECT id, content, done
    FROM todos
    ORDER BY id ASC
  `);

  return result.rows;
};

const createTodo = async (content) => {
  const result = await pool.query(
    "INSERT INTO todos (content, done) VALUES ($1, false) RETURNING id, content, done",
    [content]
  );

  return result.rows[0];
};

const updateTodoDone = async (id, done) => {
  const result = await pool.query(
    "UPDATE todos SET done = $1 WHERE id = $2 RETURNING id, content, done",
    [done, id]
  );

  return result.rows[0];
};

const server = http.createServer(async (req, res) => {
  try {
    await initialized;

    if (req.method === "GET" && req.url === "/healthz") {
      try {
        await healthCheck();
        sendJson(res, 200, { status: "ok" });
      } catch (error) {
        sendJson(res, 500, {
          status: "unhealthy",
          error: error.message
        });
      }

      return;
    }

    if (req.method === "POST" && req.url === "/break") {
      isHealthy = false;

      log("app_broken_manually");

      sendJson(res, 200, { status: "broken" });
      return;
    }

    if (!isHealthy) {
      sendJson(res, 500, { error: "Application is unhealthy" });
      return;
    }

    if (req.method === "GET" && req.url === "/todos") {
      log("todos_requested", {
        method: req.method,
        path: req.url
      });

      const todos = await getTodos();
      sendJson(res, 200, todos);
      return;
    }

    if (req.method === "POST" && req.url === "/todos") {
      const body = await readRequestBody(req);
      const content = parseTodoContent(body).trim();

      log("todo_received", {
        method: req.method,
        path: req.url,
        content,
        length: content.length
      });

      if (!content) {
        log("todo_rejected_empty", {
          reason: "Todo content is required"
        });

        sendJson(res, 400, { error: "Todo content is required" });
        return;
      }

      if (content.length > 140) {
        log("todo_rejected_too_long", {
          reason: "Todo must be 140 characters or less",
          content,
          length: content.length
        });

        sendJson(res, 400, { error: "Todo must be 140 characters or less" });
        return;
      }

      const todo = await createTodo(content);

      log("todo_created", {
        id: todo.id,
        content: todo.content,
        done: todo.done,
        length: todo.content.length
      });

      sendJson(res, 201, todo);
      return;
    }

    const todoIdMatch = req.url.match(/^\/todos\/(\d+)$/);

    if (req.method === "PUT" && todoIdMatch) {
      const id = Number(todoIdMatch[1]);
      const body = await readRequestBody(req);
      const done = parseDoneValue(body);

      const todo = await updateTodoDone(id, done);

      if (!todo) {
        log("todo_update_failed_not_found", { id });
        sendJson(res, 404, { error: "Todo not found" });
        return;
      }

      log("todo_updated", {
        id: todo.id,
        content: todo.content,
        done: todo.done
      });

      sendJson(res, 200, todo);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    log("request_failed", {
      method: req.method,
      path: req.url,
      error: error.message
    });

    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  log("server_started", {
    port: PORT
  });
});