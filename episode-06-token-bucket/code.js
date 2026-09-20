// Rate limiter: allow bursts up to `capacity`, refill at `refillRate` tokens/sec.
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity; // start full
    this.lastChecked = Date.now();
  }

  allowRequest() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastChecked) / 1000;
    this.lastChecked = now;

    // Lazily top up the bucket for however long we've been idle
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

const bucket = new TokenBucket(5, 1);
const results = Array.from({ length: 6 }, () => bucket.allowRequest());
console.log(results); // burst of 5 allowed, 6th rejected

module.exports = TokenBucket;
