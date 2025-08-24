"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoxIdPool = void 0;
class BoxIdPool {
    maxId;
    maxHoldingTimeMs;
    inUse;
    waiters;
    constructor(maxId, maxHoldingTimeMs) {
        this.maxId = maxId;
        this.maxHoldingTimeMs = maxHoldingTimeMs;
        this.inUse = new Map();
        this.waiters = [];
    }
    async acquire() {
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
            await new Promise(resolve => this.waiters.push(resolve));
        }
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
