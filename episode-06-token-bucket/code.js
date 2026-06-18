class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastChecked = Date.now();
    }

    allowRequest() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastChecked) / 1000;
        this.lastChecked = now;

        // Lazily refill based on however much time has passed
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// Burst of 6 requests: first 5 pass, the 6th is rejected
const bucket = new TokenBucket(5, 1); // 5 burst, 1/sec sustained

for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "rejected"}`);
}

console.log("Waiting 3 seconds for refill...");
setTimeout(() => {
    console.log(`Request after wait: ${bucket.allowRequest() ? "allowed" : "rejected"}`);
}, 3000);
