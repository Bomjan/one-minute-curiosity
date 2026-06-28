import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity        # max tokens the bucket can hold
        self.refill_rate = refill_rate  # tokens added per second
        self.tokens = capacity          # start full
        self.last_refill = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_refill

        # Lazily top up tokens based on elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests instantly: first 5 allowed, 6th denied
    for i in range(6):
        print(f"Request {i + 1}: {'allowed' if bucket.allow_request() else 'denied'}")

    # Wait for a partial refill, then try again
    time.sleep(2.5)
    print(f"After 2.5s wait: {'allowed' if bucket.allow_request() else 'denied'}")
