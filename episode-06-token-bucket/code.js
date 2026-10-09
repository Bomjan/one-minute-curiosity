class TokenBucket {
  constructor(capacity, refillPerSec, clock = () => performance.now() / 1000) {
    this.capacity = capacity;
    this.rate = refillPerSec;
    this.clock = clock;
    this.tokens = capacity;
    this.last = clock();
  }

  allow(cost = 1) {
    // Lazy refill: no timer, just do the math when a request arrives
    const now = this.clock();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.rate);
    this.last = now;

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}

let now = 0;
const bucket = new TokenBucket(5, 1, () => now);

console.log(Array.from({ length: 7 }, () => bucket.allow())); // 5 true, 2 false
now = 2;
console.log(Array.from({ length: 3 }, () => bucket.allow())); // [true, true, false]
