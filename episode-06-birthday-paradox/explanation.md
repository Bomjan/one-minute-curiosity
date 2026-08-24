# The Birthday Paradox: Why 23 People Break Your Intuition (and Your Hashes)

Put 23 random people in a room and there's better than a coin-flip chance two of them share a birthday. That's not a trick — it's math quietly telling you that collisions happen *way* sooner than intuition expects. And that same math is why cryptographers double their hash lengths.

---

## The Problem

You'd think matching one specific birthday among 23 people needs way more than 23 tries — 365 days, right? But nobody is matching a *specific* date. Everyone is a candidate to match everyone else. With 23 people there are `23×22/2 = 253` pairs, and it only takes one pair to match.

Now swap "birthday" for "hash output" and "person" for "random hash you generated." The exact same question becomes a security one: **if a hash function outputs one of `d` possible values, how many random hashes do you need to generate before two collide?**

The surprising answer, for both: roughly **√d**, not d.

---

## Example

```
365 possible birthdays:
  10 people -> 11.7% chance of a match
  20 people -> 41.1% chance of a match
  23 people -> 50.7% chance of a match   <- tipping point
  50 people -> 97.0% chance of a match

65,536 possible hash values (a toy 16-bit hash):
  ~302 random hashes -> 50% chance two collide
  (not 32,768 — the halfway point of the space)
```

---

## Why It Matters

This single formula quietly underpins a lot of real systems:

| Domain | Where it shows up |
| :--- | :--- |
| **Cybersecurity** | Birthday attacks on hash functions — why MD5 (128-bit) is breakable and SHA-256 needs 256 bits, not 128, for real security margin |
| **Distributed systems** | Odds of two independently generated UUIDs or request IDs colliding as fleet size grows |
| **Databases** | Hash table load factor — collisions arrive far earlier than "table is half full" |
| **Networking** | TCP sequence number / session ID prediction attacks |
| **Probabilistic algorithms** | Sizing Bloom filters and sketches correctly so false-positive math doesn't blindside you |

The deeper lesson: **when anything-can-match-anything, the odds explode combinatorially.** Linear intuition ("need about half the space") is wrong by a square-root factor — and that factor is exactly why security engineers halve their assumed protection whenever "any pair" is in play.

---

## Solution

### The Key Insight: Count the Pairs, Not the People

For `n` items drawn from `d` equally likely buckets, it's easier to compute the probability of **no** collision and subtract from 1:

```
P(no collision) = (d/d) × (d-1)/d × (d-2)/d × ... × (d-n+1)/d
P(collision)     = 1 - P(no collision)
```

Each new person has slightly fewer "safe" birthdays to land on than the last, and those shrinking odds compound fast.

### The Shortcut: Why √d, Not d/2

Approximating the product with `e^-x` gives a clean closed form:

```
P(collision) ≈ 1 - e^(-n(n-1) / 2d)
```

Solving for `n` at `P = 0.5`:

```
n ≈ 1.1774 × √d
```

For `d = 365`, that's `1.1774 × 19.1 ≈ 22.5` → **23 people**. For a 128-bit hash (`d = 2^128`), that's around `2^64` attempts — which is exactly why a "128-bit secure" hash is only considered 64-bit secure *against collision attacks*.

### Beginner-Friendly Walkthrough

1. Start with `P(no collision) = 1`.
2. For each new item, multiply by the fraction of buckets still unused.
3. Once the product drops below 0.5, you've crossed the 50% collision line.
4. Or skip the loop entirely and plug `d` into `1.1774 × √d` for an instant estimate.

---

## Code

### Python

```python
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
    for n in (10, 20, 23, 30, 50):
        p = collision_probability(n, 365)
        print(f"{n:>2} people -> {p:.1%} chance of a shared birthday")

    print(f"\nEstimated people needed for >50% odds: {min_items_for_collision(365)}")

    hash_space = 2 ** 16
    print(f"\nToy 16-bit hash space ({hash_space} buckets):")
    print(f"  Closed-form estimate: ~{min_items_for_collision(hash_space)} hashes")
    print(f"  Empirical average:    ~{simulate_collision(hash_space):.0f} hashes")
```

### JavaScript

```javascript
function collisionProbability(n, d) {
    if (n > d) return 1.0;
    let pNoCollision = 1.0;
    for (let i = 0; i < n; i++) {
        pNoCollision *= (d - i) / d;
    }
    return 1 - pNoCollision;
}

function minItemsForCollision(d, targetProb = 0.5) {
    return Math.ceil(Math.sqrt(2 * d * Math.log(1 / (1 - targetProb))));
}

function simulateCollision(d, trials = 20000) {
    let totalDraws = 0;
    for (let t = 0; t < trials; t++) {
        const seen = new Set();
        let draws = 0;
        while (true) {
            draws++;
            const bucket = Math.floor(Math.random() * d);
            if (seen.has(bucket)) break;
            seen.add(bucket);
        }
        totalDraws += draws;
    }
    return totalDraws / trials;
}

for (const n of [10, 20, 23, 30, 50]) {
    console.log(`${n} people -> ${(collisionProbability(n, 365) * 100).toFixed(1)}%`);
}

console.log(`Estimated people needed for >50% odds: ${minItemsForCollision(365)}`);

const hashSpace = 2 ** 16;
console.log(`Closed-form estimate: ~${minItemsForCollision(hashSpace)} hashes`);
console.log(`Empirical average:    ~${simulateCollision(hashSpace).toFixed(0)} hashes`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (closed-form)** | O(1) | A single square-root formula gives the estimate instantly |
| **Time (exact/simulated)** | O(n) | Looping through n draws, or n trials for empirical verification |
| **Space** | O(n) | The simulation needs a `seen` set sized up to n; the closed-form needs none |

The formula-based estimate is the one that scales — you'd never want to loop through `2^64` hashes to *prove* a collision exists. You just need the √d bound to know how much security margin you actually have.

---

## One Minute Insight

> **Whenever "any pair can match" is on the table, think in pairs, not singles — and expect √d, not d/2.**

This is why a 64-bit hash is nowhere near as safe as its bit count suggests, why UUID collisions become a real (if tiny) risk at planetary scale, and why 23 strangers in a room will beat your gut instinct almost every time. The birthday paradox isn't a party trick — it's the reason security engineers double their key lengths.

*Run `code.py` or `code.js` to watch the math and the simulation agree.*
