/**
 * The Bucket That Never Overflows — Token Bucket Rate Limiter
 *
 * A bucket holds up to `capacity` tokens and refills at `refillRate`
 * tokens per second. Each request costs one token. No background timer:
 * the refill is computed lazily, only when a request actually arrives.
 */

class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastCheck = Date.now() / 1000;
    }

    allowRequest() {
        const now = Date.now() / 1000;
        const elapsed = now - this.lastCheck;
        this.lastCheck = now;

        // Lazily refill based on elapsed time, capped at capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

const bucket = new TokenBucket(5, 1); // 5 burst, 1/sec sustained

// Burn the whole burst instantly
for (let i = 0; i < 7; i++) {
    console.log(`request ${i}: ${bucket.allowRequest() ? "ALLOW" : "DENY"}`);
}

// Wait for a partial refill, then try again
setTimeout(() => {
    console.log(`after 3s wait: ${bucket.allowRequest() ? "ALLOW" : "DENY"}`);
}, 3000);
