import * as readline from "readline";

interface Greeting { name: string; count: number }

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line: string) => {
    const g: Greeting = { name: line.trim(), count: 1 };
    console.log(`hello ${g.name} ${g.count} ${process.version}`);
    rl.close();
});
