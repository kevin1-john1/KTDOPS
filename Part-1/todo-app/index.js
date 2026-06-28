const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const CACHE_DIR = "/usr/src/app/files";
const IMAGE_PATH = path.join(CACHE_DIR, "image.jpg");
const META_PATH = path.join(CACHE_DIR, "image-meta.json");
const TEN_MINUTES = 10 * 60 * 1000;

fs.mkdirSync(CACHE_DIR, { recursive: true });

const todos = [
  "Learn Kubernetes basics",
  "Create a todo app",
  "Add persistent storage"
];

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

  return Date.now() - meta.createdAt < TEN_MINUTES;
};

const downloadImage = async () => {
  const response = await fetch("https://picsum.photos/1200");

  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(IMAGE_PATH, buffer);
  fs.writeFileSync(META_PATH, JSON.stringify({ createdAt: Date.now() }));

  console.log("Downloaded new image from Lorem Picsum");
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

const renderHtml = () => `
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
      }
    </style>
  </head>
  <body>
    <h1>Todo App</h1>

    <img src="/image.jpg" alt="Random image" />

    <form>
      <input
        type="text"
        maxlength="140"
        placeholder="Write a todo"
      />
      <button type="button">Send</button>
    </form>

    <h2>Todos</h2>
    <ul>
      ${todos.map((todo) => `<li>${todo}</li>`).join("")}
    </ul>
  </body>
</html>
`;

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    await ensureImage();

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderHtml());
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
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});