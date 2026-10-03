import time


class TokenBucket:
    """Rate limiter that allows bursts but caps the average rate."""

    def __init__(self, capacity, refill_per_sec, clock=time.monotonic):
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        self.clock = clock
        self.tokens = capacity
        self.last = clock()

    def allow(self, cost=1):
        # Lazy refill: no timer thread, just do the math when someone knocks.
        now = self.clock()
        elapsed = now - self.last
        self.last = now
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    t = [0.0]  # fake clock so the demo is deterministic
    bucket = TokenBucket(capacity=3, refill_per_sec=1, clock=lambda: t[0])

    for second, requests in [(0, 5), (1, 2), (10, 4)]:
        t[0] = second
        results = [bucket.allow() for _ in range(requests)]
        print(f"t={second:>2}s ->", results)
