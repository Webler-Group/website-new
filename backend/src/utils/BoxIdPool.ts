type UsedId = {
    timeoutId: NodeJS.Timeout;
};

export class BoxIdPool {
    private maxId: number;
    private maxHoldingTimeMs: number;
    private inUse : Map<number, UsedId>;
    private waiters: (() => void)[];
    
    constructor(maxId: number, maxHoldingTimeMs: number) {
        this.maxId = maxId;
        this.maxHoldingTimeMs = maxHoldingTimeMs;
        this.inUse = new Map();
        this.waiters = [];
    }

    async acquire() {
        while(true) {
            for(let i = 0; i <= this.maxId; ++i) {
                if(!this.inUse.has(i)) {
                    const timeoutId = setTimeout(() => {
                        this.release(i);
                    });
                    this.inUse.set(i, {
                        timeoutId
                    });
                    return i;
                }
            }

            await new Promise<void>(resolve => this.waiters.push(resolve));
        }
    }

    release(id: number) {
        const usedId = this.inUse.get(id);
        if(usedId) {
            clearTimeout(usedId.timeoutId);
            this.inUse.delete(id);
        }
        const waiter = this.waiters.shift();
        if(waiter) {
            waiter();
        }
    }
}