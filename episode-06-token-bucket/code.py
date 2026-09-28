class TokenBucket:
    """Allow bursts up to `capacity`, but only `rate` requests/second long-term."""

    def __init__(self, capacity, rate, now=0.0):
        self.capacity = capacity
        self.rate = rate
        self.tokens = capacity
        self.last = now

    def allow(self, now, cost=1):
        # Refill lazily: no timer thread, just math on the elapsed time.
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last = now

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=3, rate=1)  # burst of 3, then 1 per second
    for t in [0, 0, 0, 0, 0.5, 1, 2, 2.1]:
        print(f"t={t:<4} -> {'ALLOW' if bucket.allow(t) else 'DENY'}")
