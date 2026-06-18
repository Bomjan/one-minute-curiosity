import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_checked = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_checked
        self.last_checked = now

        # Lazily refill based on however much time has passed
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)  # 5 burst, 1/sec sustained

    # Burst of 6 requests: first 5 pass, the 6th is rejected
    for i in range(6):
        print(f"Request {i + 1}: {'allowed' if bucket.allow_request() else 'rejected'}")

    print("Waiting 3 seconds for refill...")
    time.sleep(3)
    print(f"Request after wait: {'allowed' if bucket.allow_request() else 'rejected'}")
