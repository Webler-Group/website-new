import * as fs from 'fs';
import * as path from 'path';

// Get project directory from command-line args
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: node gen-backend-service.js <project_directory>');
  process.exit(1);
}

const projectDir = path.resolve(args[0]);

const backendService = `
[Unit]
Description=Weblercodes backend
After=network.target

[Service]
ExecStart=${process.execPath} ${path.join(projectDir, "backend/dist/server.js")}
Restart=always
User=webler
Group=webler
Environment=NODE_ENV=production
WorkingDirectory=${path.join(projectDir, "backend")}

[Install]
WantedBy=multi-user.target
`.trim();

const outputPath = path.resolve("website-new-backend.service");
fs.writeFileSync(outputPath, backendService, 'utf-8');

console.log(`backend service generated successfully at ${outputPath}`);