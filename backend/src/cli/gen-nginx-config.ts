import * as fs from 'fs';
import * as path from 'path';

// Get project directory from command-line args
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: node gen-nginx-config.js <project_directory>');
  process.exit(1);
}

const projectDir = path.resolve(args[0]);

const nginxConfig = `
server {
  listen 80;
  server_name localhost;

  location / {
    root ${projectDir}/frontend/dist;
    index index.html index.htm;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:5500;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /uploads {
    proxy_pass http://localhost:5500;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
`.trim();

const outputPath = path.resolve('nginx-config');
fs.writeFileSync(outputPath, nginxConfig, 'utf-8');

console.log(`nginx config generated successfully at ${outputPath}`);
