class TokenBucket {
  // Allows bursts up to `capacity`, then throttles to a steady `refillRate` tokens/sec.
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastCheck = Date.now();
  }

  _refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastCheck) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRate);
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

// 5 token capacity, refilling at 1 token/sec — like a 5-request burst, then 1 req/sec.
const bucket = new TokenBucket(5, 1);

for (let i = 0; i < 7; i++) {
  console.log(`request ${i + 1}: ${bucket.allow() ? "allowed" : "blocked"}`);
}
