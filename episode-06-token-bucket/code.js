class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastRefill = Date.now();
    }

    allowRequest() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;

        // Lazily top up tokens based on elapsed time, capped at capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// Burst of 6 requests instantly: first 5 allowed, 6th denied
const bucket = new TokenBucket(5, 1);
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}

// Wait for a partial refill, then try again
setTimeout(() => {
    console.log(`After 2.5s wait: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}, 2500);
