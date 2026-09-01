import hmac
import time


def insecure_equals(a: str, b: str) -> bool:
    """What most people write by hand — leaks timing info via early exit."""
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x != y:
            return False  # early exit = the vulnerability
    return True


def constant_time_equals(a: str, b: str) -> bool:
    """Every byte is inspected, every time. No early exit, no timing leak."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0


if __name__ == "__main__":
    secret = "S3cr3t!"

    print(insecure_equals(secret, "S3cr3t!"))       # True
    print(constant_time_equals(secret, "S3cr3t!"))  # True

    # In production, don't hand-roll this — use the standard library:
    print(hmac.compare_digest(secret, "S3cr3t!"))    # True

    # A tiny demo of the timing gap insecure_equals introduces.
    def timeit(fn, guess, rounds=20000):
        start = time.perf_counter()
        for _ in range(rounds):
            fn(secret, guess)
        return (time.perf_counter() - start) / rounds

    near_miss = "S3cr3tX"   # wrong only in the last character
    far_miss = "Xxxxxxx"    # wrong from the very first character

    print("insecure, near miss :", timeit(insecure_equals, near_miss))
    print("insecure, far miss  :", timeit(insecure_equals, far_miss))
    print("constant, near miss :", timeit(constant_time_equals, near_miss))
    print("constant, far miss  :", timeit(constant_time_equals, far_miss))
