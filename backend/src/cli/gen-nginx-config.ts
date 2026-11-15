import * as fs from 'fs';
import * as path from 'path';

// Get project directory from command-line args
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: node gen-nginx-config.js <project_directory>');
  process.exit(1);
}

const projectDir = path.resolve(args[0]);

// Fallback copy of https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6,
// used only when the live lists can't be downloaded while generating the config.
const FALLBACK_CLOUDFLARE_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32"
];

const CIDR_REGEX = /^[0-9a-fA-F:.]+\/\d{1,3}$/;

const fetchCloudflareRanges = async (): Promise<string[]> => {
  try {
    const lists = await Promise.all(
      ["https://www.cloudflare.com/ips-v4", "https://www.cloudflare.com/ips-v6"].map(async (url) => {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`${url} responded ${res.status}`);
        return (await res.text()).split(/\s+/).filter(Boolean);
      })
    );
    const ranges = lists.flat();
    if (ranges.length === 0 || !ranges.every(r => CIDR_REGEX.test(r))) {
      throw new Error("unexpected response format");
    }
    return ranges;
  } catch (err) {
    console.warn(`Could not download Cloudflare IP ranges (${err instanceof Error ? err.message : err}), using built-in fallback list`);
    return FALLBACK_CLOUDFLARE_RANGES;
  }
};

const main = async () => {
const cloudflareRanges = await fetchCloudflareRanges();

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

    # --- REAL CLIENT IP ---
    # Only trust CF-Connecting-IP when the request really comes from Cloudflare.
    # For anyone connecting to the origin directly, $remote_addr stays their own address,
    # so a spoofed CF-Connecting-IP header is ignored.
${cloudflareRanges.map(r => `    set_real_ip_from ${r};`).join("\n")}
    real_ip_header CF-Connecting-IP;

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
    location ~ ^/(api|media|socket\.io) {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # Overwrite (not append) so the backend only ever sees the verified client IP
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header CF-Connecting-IP "";
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
};

main();
