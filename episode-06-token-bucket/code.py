import time


class TokenBucket:
    def __init__(self, capacity, refill_per_sec, clock=time.monotonic):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.clock = clock
        self.tokens = float(capacity)
        self.last = clock()

    def allow(self, cost=1):
        # Lazy refill: no timer thread, just do the math when someone knocks.
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    t = [0.0]  # fake clock so the demo is deterministic
    bucket = TokenBucket(capacity=5, refill_per_sec=1, clock=lambda: t[0])

    print([bucket.allow() for _ in range(7)])  # 5x True, 2x False (burst)
    t[0] += 2
    print([bucket.allow() for _ in range(3)])  # True, True, False (2 tokens refilled)
