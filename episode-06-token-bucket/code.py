import time


class TokenBucket:
    """Rate limiter: allow bursts up to `capacity`, refill at `refill_rate` tokens/sec."""

    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity  # start full
        self.last_checked = time.monotonic()

    def allow_request(self) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_checked
        self.last_checked = now

        # Lazily top up the bucket for however long we've been idle
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)
    results = [bucket.allow_request() for _ in range(6)]
    print(results)  # burst of 5 allowed, 6th rejected
