import math
import random


def collision_probability(n: int, d: int) -> float:
    """Probability that n items drawn uniformly from d buckets share a bucket."""
    if n > d:
        return 1.0
    p_no_collision = 1.0
    for i in range(n):
        p_no_collision *= (d - i) / d
    return 1 - p_no_collision


def min_items_for_collision(d: int, target_prob: float = 0.5) -> int:
    """Closed-form estimate: how many items until collision odds pass target_prob."""
    return math.ceil(math.sqrt(2 * d * math.log(1 / (1 - target_prob))))


def simulate_collision(d: int, trials: int = 20_000) -> float:
    """Empirically measure the average draws until the first repeated bucket."""
    total_draws = 0
    for _ in range(trials):
        seen = set()
        draws = 0
        while True:
            draws += 1
            bucket = random.randrange(d)
            if bucket in seen:
                break
            seen.add(bucket)
        total_draws += draws
    return total_draws / trials


if __name__ == "__main__":
    # Classic birthday paradox: 365 possible birthdays
    for n in (10, 20, 23, 30, 50):
        p = collision_probability(n, 365)
        print(f"{n:>2} people -> {p:.1%} chance of a shared birthday")

    estimate = min_items_for_collision(365)
    print(f"\nEstimated people needed for >50% odds: {estimate}")

    # Hash collisions scale the exact same way: d = size of the hash space
    hash_space = 2 ** 16  # toy 16-bit hash for a fast, visible demo
    print(f"\nToy 16-bit hash space ({hash_space} buckets):")
    print(f"  Closed-form estimate for 50% collision odds: ~{min_items_for_collision(hash_space)} hashes")
    print(f"  Empirical average draws to first collision:  ~{simulate_collision(hash_space):.0f} hashes")
    print(f"  (sqrt(hash_space) = {math.sqrt(hash_space):.0f}, matching the birthday bound)")
