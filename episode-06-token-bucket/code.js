class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens (burst size)
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    _refill() {
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

const bucket = new TokenBucket(5, 1);

// Burst of 6 requests: 5 should pass, the 6th should be denied
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}:`, bucket.allowRequest() ? "ALLOWED" : "DENIED");
}

setTimeout(() => {
    console.log("After 3s wait:", bucket.allowRequest() ? "ALLOWED" : "DENIED");
}, 3000);
