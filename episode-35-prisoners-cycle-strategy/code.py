"""The 100 prisoners puzzle: following cycles beats random guessing."""
import random


def all_escape(boxes):
    """Prisoner p follows the number found in box p, at most 50 times."""
    for prisoner in range(100):
        box = prisoner
        for _ in range(50):
            number = boxes[box]
            if number == prisoner:
                break
            box = number
        else:
            return False
    return True


def longest_cycle(boxes):
    seen = set()
    longest = 0
    for start in range(len(boxes)):
        if start in seen:
            continue
        position = start
        length = 0
        while position not in seen:
            seen.add(position)
            position = boxes[position]
            length += 1
        longest = max(longest, length)
    return longest


if __name__ == "__main__":
    rng = random.Random(2026)
    boxes = list(range(100))
    trials = 20_000
    wins = 0
    for _ in range(trials):
        rng.shuffle(boxes)
        success = all_escape(boxes)
        assert success == (longest_cycle(boxes) <= 50)
        wins += success

    exact = 1 - sum(1 / k for k in range(51, 101))
    print(f"Cycle strategy: {wins / trials:.2%} wins in {trials:,} trials")
    print(f"Exact probability: {exact:.2%}")
    print(f"Independent random guesses: 2^-100 ≈ {2**-100:.2e}")
