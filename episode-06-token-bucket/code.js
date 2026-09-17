class TokenBucket {
    constructor(capacity, rate, clock = () => Date.now() / 1000) {
        this.capacity = capacity;
        this.rate = rate;
        this.tokens = capacity;
        this.clock = clock;
        this.lastRefill = clock();
    }

    _refill() {
        const now = this.clock();
        const elapsed = now - this.lastRefill;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
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

// A controllable fake clock keeps the demo deterministic
let fakeTime = 0;
const bucket = new TokenBucket(5, 1, () => fakeTime); // 5 burst, 1 token/sec refill

// Burst of 5 requests at t=0 -> bucket starts full, all allowed
for (let i = 1; i <= 5; i++) {
    console.log(`Request ${i} at t=0:`, bucket.allowRequest()); // true x5
}

// 6th request immediately after -> denied, bucket is empty
console.log("Request 6 at t=0:", bucket.allowRequest()); // false

// 3 seconds pass -> 3 tokens refill (capped at capacity)
fakeTime = 3;
console.log("Request at t=3:", bucket.allowRequest()); // true
console.log("Request at t=3:", bucket.allowRequest()); // true
console.log("Request at t=3:", bucket.allowRequest()); // true
console.log("Request at t=3:", bucket.allowRequest()); // false, only 3 tokens refilled
