"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmail = exports.escapeHtml = exports.escapeRegex = void 0;
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
function isEmail(value) {
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return value.match(validEmailRegex) !== null;
}
exports.isEmail = isEmail;
