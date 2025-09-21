"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithZod = void 0;
function parseWithZod(schema, req) {
    const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
        cookies: req.cookies
    });
    if (!result.success) {
        throw result.error;
    }
    return result.data;
}
exports.parseWithZod = parseWithZod;
