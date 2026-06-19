import hmac
import os


def constant_time_compare(val1: str, val2: str) -> bool:
    return hmac.compare_digest(val1.encode(), val2.encode())


def constant_time_compare_manual(val1: str, val2: str) -> bool:
    b1, b2 = val1.encode(), val2.encode()
    if len(b1) != len(b2):
        b2 = b2.ljust(len(b1), b'\x00')
        result = 1
    else:
        result = 0

    for a, b in zip(b1, b2):
        result |= a ^ b

    return result == 0


if __name__ == "__main__":
    SECRET = os.environ.get("SECRET_TOKEN", "super-secret-key-42")

    tests = [
        ("super-secret-key-42", True),
        ("super-secret-key-43", False),
        ("wrong",               False),
        ("",                    False),
        ("super-secret-key-42" + "\x00", False),
    ]

    print("=== hmac.compare_digest ===")
    for token, expected in tests:
        result = constant_time_compare(SECRET, token)
        status = "✓" if result == expected else "✗"
        print(f"  {status}  {repr(token[:30])}  →  {result}")

    print("\n=== manual constant-time ===")
    for token, expected in tests:
        result = constant_time_compare_manual(SECRET, token)
        status = "✓" if result == expected else "✗"
        print(f"  {status}  {repr(token[:30])}  →  {result}")
