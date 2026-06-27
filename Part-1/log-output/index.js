const crypto = require("crypto");

const randomString = crypto.randomUUID();

setInterval(() => {
  console.log(`${new Date().toISOString()}: ${randomString}`);
}, 5000);