import time


class TokenBucket:
    """Allows bursts up to `capacity`, then throttles to a steady `refill_rate` tokens/sec."""

    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_check = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_check = now

    def allow(self, cost: float = 1) -> bool:
        self._refill()
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    # 5 token capacity, refilling at 1 token/sec — like a 5-request burst, then 1 req/sec.
    bucket = TokenBucket(capacity=5, refill_rate=1)

    for i in range(7):
        print(f"request {i + 1}: {'allowed' if bucket.allow() else 'blocked'}")
