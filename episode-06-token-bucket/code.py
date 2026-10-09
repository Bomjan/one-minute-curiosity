import time


class TokenBucket:
    """Rate limiter that allows bursts but caps the long-run rate."""

    def __init__(self, capacity, refill_per_sec, clock=time.monotonic):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.clock = clock
        self.tokens = capacity
        self.last = clock()

    def allow(self, cost=1):
        # Lazy refill: no timer thread, just do the math when a request arrives
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    now = 0.0
    bucket = TokenBucket(capacity=5, refill_per_sec=1, clock=lambda: now)

    print([bucket.allow() for _ in range(7)])  # burst: 5 True, 2 False
    now = 2.0                                  # two seconds pass
    print([bucket.allow() for _ in range(3)])  # [True, True, False]
