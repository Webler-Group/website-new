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
# Redirect non-www → www (for HTTPS)
server {
    listen 443 ssl;
    server_name weblercodes.com;

    # SSL certificates for the non-www domain
    ssl_certificate /etc/letsencrypt/live/weblercodes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/weblercodes.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Redirect to www
    return 301 https://www.weblercodes.com$request_uri;
}

# Main server block for www
server {
    listen 443 ssl;
    server_name www.weblercodes.com;

    # SSL certificates for the www domain
    ssl_certificate /etc/letsencrypt/live/weblercodes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/weblercodes.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Root directory and index file
    root ${path.join(projectDir, "frontend", "dist")};
    index index.html index.htm;

    # Increase the maximum request size if needed
    client_max_body_size 10M;

    # --- GZIP SETTINGS ---
    gzip on;
    gzip_vary on;
    gzip_disable "msie6";
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        application/javascript
        application/json
        application/xml
        text/xml
        application/xml+rss
        image/svg+xml
        font/woff2
        font/woff
        font/ttf;

    # Handle robots.txt with correct MIME type and caching
    location = /robots.txt {
        try_files $uri =404;
        access_log off;
        add_header Content-Type text/plain;
        expires 1d;  # Cache for 1 day
    }

    # Handle proxy to backend
    location ~ ^/(api|uploads|socket\.io) {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Only cache frontend build assets
    location ~* ^/(assets|resources)/.*\.(?:js|css|ico|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # index.html should never be cached
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-cache";
    }

    # Catch-all for React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
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
