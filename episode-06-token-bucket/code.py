class TokenBucket:
    def __init__(self, capacity, refill_per_sec, now=0.0):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.tokens = capacity
        self.last = now

    def allow(self, now, cost=1):
        # Lazy refill: no timer, just do the math when someone knocks
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last = now

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_per_sec=1)

    burst = [bucket.allow(now=0) for _ in range(7)]
    print(burst)  # [True, True, True, True, True, False, False]

    print(bucket.allow(now=1))  # True  (1 token refilled)
    print(bucket.allow(now=1))  # False
    print(bucket.allow(now=100))  # True  (refill is capped at capacity)
