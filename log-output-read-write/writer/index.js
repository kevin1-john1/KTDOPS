const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE_PATH = "/usr/src/app/files/output.txt";
const randomString = crypto.randomUUID();

fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });

const writeLog = () => {
  const line = `${new Date().toISOString()}: ${randomString}`;
  fs.writeFileSync(FILE_PATH, line);
  console.log(line);
};

writeLog();
setInterval(writeLog, 5000);