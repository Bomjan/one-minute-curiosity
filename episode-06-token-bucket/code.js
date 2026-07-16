// Token Bucket Rate Limiter — the algorithm behind almost every API's
// "429 Too Many Requests" response.
//
// Idea: a bucket holds tokens. Every request costs one token. The bucket
// refills gradually over time. No tokens left? The request waits or gets
// rejected. Bursts are allowed (up to the bucket's capacity), but the
// long-run average is capped by the refill rate.

class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastRefill = Date.now();
    }

    _refill() {
        // Lazy refill: only compute how many tokens accumulated
        // since the last check. No background timer needed.
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;
    }

    allowRequest() {
        this._refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// 5 tokens max, refilling 1 token every 2 seconds
const bucket = new TokenBucket(5, 0.5);

// Burst of 7 rapid requests: only the first 5 succeed immediately
for (let i = 1; i <= 7; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}
