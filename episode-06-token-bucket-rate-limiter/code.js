/**
 * Token Bucket Rate Limiter
 *
 * A bucket holds `capacity` tokens and refills at `refillRate` tokens/second.
 * Every request spends one token. No tokens left -> the request is denied.
 *
 * The trick: instead of ticking a timer every second, we compute how many
 * tokens *should* have been added since the last check, lazily, on demand.
 */

class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastRefill = Date.now();
    }

    #refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;
    }

    allowRequest() {
        this.#refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

async function main() {
    const bucket = new TokenBucket(5, 1);

    // Burst of 6 requests — the 6th should be denied (bucket only holds 5)
    for (let i = 1; i <= 6; i++) {
        console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "denied"}`);
    }

    console.log("\nWaiting 3 seconds for the bucket to refill...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(`Request 7: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}

main();
