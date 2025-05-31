import * as fs from 'fs';
import * as path from 'path';

// Get project directory from command-line args
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: ts-node generate-nginx-config.ts <project_directory>');
  process.exit(1);
}

const projectDir = path.resolve(args[0]);
const frontendDir = path.join(projectDir, 'frontend', 'dist');

if (!fs.existsSync(frontendDir)) {
  console.error(`Error: Frontend dist directory not found at ${frontendDir}`);
  process.exit(1);
}

const nginxConfig = `
server {
    listen 80;
    server_name localhost;

    root ${frontendDir};
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api {
        proxy_pass http://localhost:5500/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`.trimStart();

const outputPath = path.resolve('website-new');
fs.writeFileSync(outputPath, nginxConfig, 'utf-8');

console.log(`nginx config generated successfully at ${outputPath}`);
