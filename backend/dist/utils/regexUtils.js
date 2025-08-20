"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeRegex = void 0;
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
exports.escapeRegex = escapeRegex;
