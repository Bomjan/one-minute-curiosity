class TokenBucket {
  // Allow bursts up to `capacity`, but only `rate` requests/second long-term.
  constructor(capacity, rate, now = 0) {
    this.capacity = capacity;
    this.rate = rate;
    this.tokens = capacity;
    this.last = now;
  }

  allow(now, cost = 1) {
    // Refill lazily: no timer, just math on the elapsed time.
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

const bucket = new TokenBucket(3, 1); // burst of 3, then 1 per second
for (const t of [0, 0, 0, 0, 0.5, 1, 2, 2.1]) {
  console.log(`t=${t} -> ${bucket.allow(t) ? "ALLOW" : "DENY"}`);
}
