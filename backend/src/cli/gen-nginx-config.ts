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
# Redirect HTTP to HTTPS and non-www to www
server {
    listen 80;
    server_name weblercodes.com www.weblercodes.com;

    # Redirect to HTTPS with www
    return 301 https://www.weblercodes.com$request_uri;
}

# Redirect HTTPS non-www to www
server {
    listen 443 ssl;
    server_name weblercodes.com;

    ssl_certificate /etc/letsencrypt/live/weblercodes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/weblercodes.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://www.weblercodes.com$request_uri;
}

# Main server block for www version
server {
    listen 443 ssl;
    server_name www.weblercodes.com;

    ssl_certificate /etc/letsencrypt/live/weblercodes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/weblercodes.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        root ${path.join(projectDir, "frontend/dist")};
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
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
}
`.trim();

const outputPath = path.resolve("website-new-nginx.conf");
fs.writeFileSync(outputPath, nginxConfig, "utf-8");

console.log(`nginx config generated successfully at ${outputPath}`);
