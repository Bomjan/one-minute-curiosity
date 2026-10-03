class TokenBucket {
  constructor(capacity, refillPerSec, clock = () => performance.now() / 1000) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.clock = clock;
    this.tokens = capacity;
    this.last = clock();
  }

  allow(cost = 1) {
    // Lazy refill: no timer, just do the math when someone knocks.
    const now = this.clock();
    const elapsed = now - this.last;
    this.last = now;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}

let t = 0; // fake clock so the demo is deterministic
const bucket = new TokenBucket(3, 1, () => t);

for (const [second, requests] of [[0, 5], [1, 2], [10, 4]]) {
  t = second;
  const results = Array.from({ length: requests }, () => bucket.allow());
  console.log(`t=${String(second).padStart(2)}s ->`, results);
}
