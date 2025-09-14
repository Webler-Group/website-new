"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmail = exports.escapeMarkdown = exports.escapeHtml = exports.escapeRegex = void 0;
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
exports.escapeRegex = escapeRegex;
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
exports.escapeHtml = escapeHtml;
function escapeMarkdown(str) {
    return str
        // Handle fenced code blocks: remove ```lang and ```
        .replace(/```[\w]*\n([\s\S]*?)```/g, (_match, code) => {
        return code.trim(); // preserves content inside code blocks
    })
        // Images: ![alt](url) → [alt]
        .replace(/!\[([^\]]+)]\([^)]+\)/g, '$1')
        // Links: [text](url) → [text]
        .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
        // Bold: **text** or __text__
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        // Italic: *text* or _text_
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Strikethrough: ~~text~~
        .replace(/~~(.*?)~~/g, '$1')
        // Inline code: `code`
        .replace(/`([^`]+)`/g, '$1')
        // Headings: ## Heading → Heading
        .replace(/^#{1,6}\s*/gm, '')
        // Blockquotes: > ...
        .replace(/^>\s*/gm, '')
        // Lists: - Item, * Item, + Item, 1. Item → Item
        .replace(/^\s*([-*+]|(\d+\.))\s+/gm, '')
        // Tables: strip | and --- lines
        .replace(/^\s*\|/gm, '') // Remove leading pipes
        .replace(/\|\s*/g, ' ') // Replace remaining pipes with space
        .replace(/^-{3,}\s*/gm, '') // Remove separator rows
        // Collapse multiple spaces
        .replace(/[ \t]{2,}/g, ' ')
        // Trim lines and whitespace
        .split('\n').map(line => line.trimEnd()).join('\n')
        .trim();
}
exports.escapeMarkdown = escapeMarkdown;
function isEmail(value) {
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return value.match(validEmailRegex) !== null;
}
exports.isEmail = isEmail;
