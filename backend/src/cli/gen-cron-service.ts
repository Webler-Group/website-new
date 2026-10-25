import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.length !== 1) {
    console.error('Usage: node gen-cron-service.js <project_directory>');
    process.exit(1);
}

const projectDir = path.resolve(args[0]);

const cronService = `
[Unit]
Description=Weblercodes cron worker
After=network.target

[Service]
ExecStart=${process.execPath} ${path.join(projectDir, "backend/dist/workers/cronWorker.js")}
Restart=always
RestartSec=5
User=webler
Group=webler
UMask=0002
Environment=NODE_ENV=production
WorkingDirectory=${path.join(projectDir, "backend")}
Nice=10
IOSchedulingClass=idle

[Install]
WantedBy=multi-user.target
`.trim();

const outputPath = path.resolve("website-new-cron.service");
fs.writeFileSync(outputPath, cronService, 'utf-8');

console.log(`cron service generated successfully at ${outputPath}`);