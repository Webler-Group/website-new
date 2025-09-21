"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MulterFileTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = "MulterFileTypeError";
        Object.setPrototypeOf(this, MulterFileTypeError.prototype);
    }
}
exports.default = MulterFileTypeError;
