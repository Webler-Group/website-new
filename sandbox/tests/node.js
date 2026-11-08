const name = require("fs").readFileSync(0, "utf8").trim();
console.log(`hello ${name} ${process.version}`);
