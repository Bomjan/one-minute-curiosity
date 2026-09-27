import math
import random


def collision_probability(n, buckets):
    """Probability that n random items land in the same bucket at least once."""
    if n > buckets:
        return 1.0
    prob_no_collision = 1.0
    for i in range(n):
        prob_no_collision *= (buckets - i) / buckets
    return 1 - prob_no_collision


def items_needed_for_50_percent(buckets):
    """Birthday bound: ~1.1774 * sqrt(buckets) items give a 50% collision chance."""
    return math.ceil(1.1774 * math.sqrt(buckets))


def find_first_collision(bit_length=16, seed=None):
    """Simulate a birthday attack: hash random inputs until two collide."""
    rng = random.Random(seed)
    space = 2 ** bit_length
    seen = set()
    attempts = 0
    while True:
        attempts += 1
        item = rng.getrandbits(bit_length)
        if item in seen:
            return attempts
        seen.add(item)


if __name__ == "__main__":
    # The classic version: 365 days, 23 people
    print(f"P(shared birthday) with 23 people: {collision_probability(23, 365):.2%}")
    print(f"People needed for 50% odds: {items_needed_for_50_percent(365)}")

    # Same math, applied to a hash table
    hash_space = 2 ** 16  # a 16-bit hash
    print(f"\n16-bit hash space needs only ~{items_needed_for_50_percent(hash_space)} "
          f"items for a 50% collision chance")

    attempts = find_first_collision(bit_length=16, seed=42)
    print(f"Simulated collision found after {attempts} random 16-bit hashes")
