import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_refill = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)  # 5 burst, 1/sec refill

    # Burst of 6 immediate requests — the 6th should be denied
    for i in range(6):
        print(f"Request {i + 1}: {'ALLOWED' if bucket.allow_request() else 'DENIED'}")

    print("Waiting 3 seconds for refill...")
    time.sleep(3)
    print(f"Request after wait: {'ALLOWED' if bucket.allow_request() else 'DENIED'}")
