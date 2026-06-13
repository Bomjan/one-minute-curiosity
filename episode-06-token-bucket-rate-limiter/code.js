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

        // Refill based on elapsed time, capped at capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// Burst of 6 requests at once
const limiter = new TokenBucket(5, 1);
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${limiter.allowRequest() ? "ALLOWED" : "REJECTED"}`);
}
