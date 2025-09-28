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
# Main server block for www
server {
    listen 443 ssl;
    server_name www.weblercodes.com;
    root ${path.join(projectDir, "frontend/dist")};
    index index.html index.htm;
    client_max_body_size 10M;

    # Explicit handling for robots.txt (best for crawlers: correct MIME type, no logging, caching)
    location = /robots.txt {
        try_files $uri =404;
        access_log off;
        add_header Content-Type text/plain;
        expires 1d;  # Cache for 1 day to reduce requests
    }

    location ~* \.(?:js|css|ico|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location / {
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
    location /socket.io {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    ssl_certificate /etc/letsencrypt/live/weblercodes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/weblercodes.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
# Redirect HTTP → HTTPS (both domains)
server {
    listen 80;
    server_name weblercodes.com www.weblercodes.com;
    return 301 https://$host$request_uri;
}
`.trim();

const outputPath = path.resolve("website-new-nginx.conf");
fs.writeFileSync(outputPath, nginxConfig, "utf-8");

console.log(`nginx config generated successfully at ${outputPath}`);
