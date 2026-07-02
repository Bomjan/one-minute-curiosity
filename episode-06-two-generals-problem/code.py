import random


def two_generals_attempt(success_prob=0.9, max_retries=10):
    """Simulate a message + ack across an unreliable channel.
    Returns the round the handshake succeeded on, or None if it never did."""
    for round_num in range(1, max_retries + 1):
        message_delivered = random.random() < success_prob
        ack_delivered = message_delivered and random.random() < success_prob
        if ack_delivered:
            return round_num
    return None


def confidence_after_rounds(rounds, success_prob=0.9):
    """Analytic probability that at least one round trip succeeds within `rounds` tries.
    Approaches 1.0 but mathematically never reaches it."""
    round_trip_success = success_prob ** 2
    return 1 - (1 - round_trip_success) ** rounds


if __name__ == "__main__":
    for r in (1, 3, 5, 10, 20):
        print(f"After {r:>2} retries: {confidence_after_rounds(r):.6f} confidence")
