// Token Bucket rate limiter.
//
// A bucket holds up to `capacity` tokens and refills at `refillRate`
// tokens per second. Every request costs one token; no token, no service.

class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate; // tokens added per second
        this.tokens = capacity;
        this.lastCheck = Date.now();
    }

    _refill() {
        const now = Date.now();
        const elapsed = (now - this.lastCheck) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
        this.lastCheck = now;
    }

    allow(cost = 1) {
        this._refill();
        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        return false;
    }
}

// 5 tokens max, refilling 1 token every second.
const bucket = new TokenBucket(5, 1);

// Burst of 7 requests arriving instantly.
for (let i = 1; i <= 7; i++) {
    console.log(`request ${i}: ${bucket.allow() ? "allowed" : "rejected"}`);
}

console.log("waiting 2 seconds for refill...");
setTimeout(() => {
    console.log(`request 8: ${bucket.allow() ? "allowed" : "rejected"}`);
}, 2000);
