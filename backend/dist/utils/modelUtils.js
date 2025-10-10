"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthorizedRole = void 0;
const isAuthorizedRole = (req, expectedRoles) => req.roles && req.roles.some(i => expectedRoles.includes(i));
exports.isAuthorizedRole = isAuthorizedRole;
