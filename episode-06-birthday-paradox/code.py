import random


def collision_probability(n, d):
    """Probability that at least 2 of n random picks from d options collide."""
    if n > d:
        return 1.0  # pigeonhole principle: guaranteed collision

    prob_all_unique = 1.0
    for i in range(n):
        prob_all_unique *= (d - i) / d

    return 1 - prob_all_unique


def picks_until_50_percent(d):
    """Smallest n where collision probability crosses 50%."""
    n = 1
    while collision_probability(n, d) < 0.5:
        n += 1
    return n


def simulate_collision(d, trials=10000):
    """Monte Carlo check: average picks needed before a repeat appears."""
    total_picks = 0
    for _ in range(trials):
        seen = set()
        picks = 0
        while True:
            picks += 1
            value = random.randint(0, d - 1)
            if value in seen:
                break
            seen.add(value)
        total_picks += picks
    return total_picks / trials


if __name__ == "__main__":
    # The classic: 365 days in a year, 23 people
    days = 365
    print(f"Days: {days}")
    print(f"Probability of a shared birthday with 23 people: {collision_probability(23, days):.2%}")
    print(f"People needed for >50% chance: {picks_until_50_percent(days)}")

    # Now scale it up: a 6-character hex ID has 16^6 possibilities
    hex_space = 16 ** 6
    safe_n = picks_until_50_percent(hex_space)
    print(f"\nHex space size: {hex_space:,}")
    print(f"IDs needed for >50% collision chance: {safe_n:,} (~sqrt of space)")

    # Sanity check with a quick simulation
    avg_picks = simulate_collision(hex_space, trials=2000)
    print(f"Simulated average picks until first collision: {avg_picks:.1f}")
