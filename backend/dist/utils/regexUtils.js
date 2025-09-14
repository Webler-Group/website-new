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
    if (!str)
        return "";
    // First handle links: [text](url) -> text
    str = str.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Escape GitHub-flavored Markdown special characters
    // Characters to escape: \ ` * _ { } [ ] ( ) # + - . ! | > ~
    return str.replace(/([\\`*_{}[\]()#+\-.!|>~])/g, "\\$1");
}
exports.escapeMarkdown = escapeMarkdown;
function isEmail(value) {
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return value.match(validEmailRegex) !== null;
}
exports.isEmail = isEmail;
