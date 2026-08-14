class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold (burst size)
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastCheck = Date.now();
    }

    allowRequest(tokensNeeded = 1) {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastCheck) / 1000;
        this.lastCheck = now;

        // Refill based on time passed, never exceeding capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);

        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }
        return false;
    }
}

// Allows bursts of up to 5 requests, then throttles to 1 request/sec
const bucket = new TokenBucket(5, 1);

for (let i = 0; i < 7; i++) {
    const allowed = bucket.allowRequest();
    console.log(`Request ${i + 1}: ${allowed ? "allowed" : "rejected"}`);
}
