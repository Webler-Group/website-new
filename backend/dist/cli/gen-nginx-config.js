"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
