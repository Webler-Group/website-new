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
User=root
Environment=NODE_ENV=development
WorkingDirectory=${path.join(projectDir, "backend")}

[Install]
WantedBy=multi-user.target
`.trim();
const outputPath = path.resolve("website-new-backend.service");
fs.writeFileSync(outputPath, backendService, 'utf-8');
console.log(`backend service generated successfully at ${outputPath}`);
