const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const GREETER_URL = process.env.GREETER_URL || "http://greeter-svc";

const randomString = crypto.randomUUID();

const getGreeting = async () => {
  try {
    const response = await fetch(GREETER_URL);

    if (!response.ok) {
      throw new Error(`Greeter returned ${response.status}`);
    }

    return (await response.text()).trim();
  } catch (error) {
    console.error("Could not fetch greeting:", error.message);
    return "Greeting unavailable";
  }
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const timestamp = new Date().toISOString();
    const greeting = await getGreeting();

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(
      `${timestamp}: ${randomString}\n` +
      `Greeting: ${greeting}\n`
    );

    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

server.listen(PORT, () => {
  console.log(`Service mesh log output started in port ${PORT}`);
});