class TokenBucket {
    constructor(capacity, refillPerSec, now = 0) {
        this.capacity = capacity;
        this.rate = refillPerSec;
        this.tokens = capacity;
        this.last = now;
    }

    allow(now, cost = 1) {
        // Lazy refill: no timer, just do the math when someone knocks
        const elapsed = now - this.last;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
        this.last = now;

        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        return false;
    }
}

const bucket = new TokenBucket(5, 1);

console.log(Array.from({ length: 7 }, () => bucket.allow(0))); // 5 true, 2 false
console.log(bucket.allow(1));   // true  (1 token refilled)
console.log(bucket.allow(1));   // false
console.log(bucket.allow(100)); // true  (refill is capped at capacity)
