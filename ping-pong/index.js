const http = require("http");
const { Pool } = require("pg");

const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;

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

const initializeDatabase = async () => {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ping_pong_counter (
          id INTEGER PRIMARY KEY,
          value INTEGER NOT NULL
        )
      `);

      await pool.query(`
        INSERT INTO ping_pong_counter (id, value)
        VALUES (1, 0)
        ON CONFLICT (id) DO NOTHING
      `);

      console.log("Ping-pong database initialized");
      return;
    } catch (error) {
      console.error(
        `Database initialization failed, attempt ${attempt}/${maxAttempts}:`,
        error.message
      );

      await sleep(2000);
    }
  }

  throw new Error("Could not initialize database");
};

const initialized = initializeDatabase();

const getCounter = async () => {
  const result = await pool.query(
    "SELECT value FROM ping_pong_counter WHERE id = 1"
  );

  return result.rows[0].value;
};

const incrementAndReturnPrevious = async () => {
  const result = await pool.query(`
    UPDATE ping_pong_counter
    SET value = value + 1
    WHERE id = 1
    RETURNING value - 1 AS previous
  `);

  return result.rows[0].previous;
};

const server = http.createServer(async (req, res) => {
  try {
    await initialized;

    if (req.method === "GET" && req.url === "/pingpong") {
      const previous = await incrementAndReturnPrevious();

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`pong ${previous}\n`);
      return;
    }

    if (req.method === "GET" && req.url === "/pings") {
      const counter = await getCounter();

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`${counter}\n`);
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
  console.log(`Ping-pong app started in port ${PORT}`);
});