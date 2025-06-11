"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoxIdPool = void 0;
class BoxIdPool {
    constructor(maxId, maxHoldingTimeMs) {
        this.maxId = maxId;
        this.maxHoldingTimeMs = maxHoldingTimeMs;
        this.inUse = new Map();
        this.waiters = [];
    }
    acquire() {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                for (let i = 0; i <= this.maxId; ++i) {
                    if (!this.inUse.has(i)) {
                        const timeoutId = setTimeout(() => {
                            this.release(i);
                        });
                        this.inUse.set(i, {
                            timeoutId
                        });
                        return i;
                    }
                }
                yield new Promise(resolve => this.waiters.push(resolve));
            }
        });
    }
    release(id) {
        const usedId = this.inUse.get(id);
        if (usedId) {
            clearTimeout(usedId.timeoutId);
            this.inUse.delete(id);
        }
        const waiter = this.waiters.shift();
        if (waiter) {
            waiter();
        }
    }
}
exports.BoxIdPool = BoxIdPool;
