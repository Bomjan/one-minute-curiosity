// Episode 06: Token Bucket Rate Limiter
// Allow or deny requests based on a bucket of tokens that refills over time.
// No background timers needed — refill is computed lazily on each check.

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

        // Refill lazily based on time passed since the last check
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}


const bucket = new TokenBucket(5, 1); // 5 tokens, refills 1/sec

// Burst of 6 quick requests — the 6th should be denied
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "ALLOWED" : "DENIED"}`);
}

console.log("Waiting 3 seconds for refill...");
setTimeout(() => {
    console.log(`Request after wait: ${bucket.allowRequest() ? "ALLOWED" : "DENIED"}`);
}, 3000);
