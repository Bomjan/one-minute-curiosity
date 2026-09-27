# The Birthday Paradox: Why 23 People Break Your Hash Table

Put 23 random strangers in a room and there's a better-than-coin-flip chance two of them share a birthday. It feels wrong — 365 days, only 23 people — but the math doesn't care about your intuition, and neither does your hash function.

---

## The Problem

You're not comparing *your* birthday against everyone else's (that's only 22 comparisons against one fixed date). You're comparing **every pair** against **every other pair**. With 23 people, that's `C(23, 2) = 253` chances for a match, not 23.

Now swap "birthday" for "hash value." A hash function that outputs `b` possible values behaves exactly like a calendar with `b` days. The question "how many random items until two collide?" is the *same equation* whether you're talking about birthdays, hash buckets, session tokens, or cryptographic digests.

**The surprising part:** you don't need anywhere close to `b` items. You need roughly `√b`.

---

## Example

```
365 possible birthdays, 23 people
→ P(at least one shared birthday) ≈ 50.7%

65,536 possible hash values (16-bit hash), ~302 random items
→ P(at least one collision) ≈ 50%
```

Notice: 302 is nowhere near 65,536. It's roughly `1.18 × √65536`. That square-root relationship is the entire punchline of the birthday paradox.

---

## Why It Matters

This isn't a party trick — it's a load-bearing wall in real systems:

| Domain | Where the birthday bound shows up |
| :--- | :--- |
| **Cybersecurity** | The "birthday attack" — finding two inputs with the same hash digest takes roughly `2^(n/2)` tries, not `2^n`. This is *why* MD5 (128-bit) and SHA-1 (160-bit) are considered broken for collision resistance. |
| **Databases** | Hash indexes and hash joins start seeing bucket collisions far earlier than engineers expect, degrading O(1) lookups toward O(n). |
| **Distributed systems** | UUID and short-ID generators (order IDs, URL shorteners) need enough bits, or "random enough" IDs start colliding sooner than intuition suggests. |
| **Networking** | TCP sequence number prediction and DNS query ID guessing both exploit small collision spaces via birthday-style reasoning. |

The lesson: **"astronomically many possibilities" is not the same as "astronomically hard to collide."** Only the square root of the space matters.

---

## Solution

### The Key Insight: Count Pairs, Not People

With `n` items and `b` buckets, it's easier to compute the probability of **no** collision and subtract from 1:

```
P(no collision) = (b/b) × ((b-1)/b) × ((b-2)/b) × ... × ((b-n+1)/b)
P(collision)     = 1 - P(no collision)
```

Each new item has slightly fewer "safe" buckets left to land in than the last, and those shrinking odds compound fast.

### The Shortcut Formula

Solving for the `n` where `P(collision) ≈ 50%` gives a clean approximation:

```
n ≈ 1.1774 × √b
```

That's the whole trick: **collisions become likely around the square root of your space**, not somewhere near the full size of it.

### Beginner-Friendly Walkthrough

1. Start with `P(no collision) = 1`.
2. For each new item `i` (0-indexed), multiply by `(b - i) / b` — the fraction of buckets still unused.
3. After `n` items, `1 - P(no collision)` is your collision probability.
4. To reverse-engineer "how many items until 50% odds," just plug `b` into `1.1774 × √b`.
5. To *see* it happen, simulate: keep hashing random values into a set until you hit a duplicate, and count the attempts.

---

## Code

### Python

```python
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
```

### JavaScript

```javascript
function collisionProbability(n, buckets) {
    // Probability that n random items land in the same bucket at least once.
    if (n > buckets) return 1;
    let probNoCollision = 1;
    for (let i = 0; i < n; i++) {
        probNoCollision *= (buckets - i) / buckets;
    }
    return 1 - probNoCollision;
}

function itemsNeededFor50Percent(buckets) {
    // Birthday bound: ~1.1774 * sqrt(buckets) items give a 50% collision chance.
    return Math.ceil(1.1774 * Math.sqrt(buckets));
}

function findFirstCollision(bitLength = 16) {
    // Simulate a birthday attack: hash random inputs until two collide.
    const space = 2 ** bitLength;
    const seen = new Set();
    let attempts = 0;
    while (true) {
        attempts++;
        const item = Math.floor(Math.random() * space);
        if (seen.has(item)) return attempts;
        seen.add(item);
    }
}

// The classic version: 365 days, 23 people
console.log(`P(shared birthday) with 23 people: ${(collisionProbability(23, 365) * 100).toFixed(2)}%`);
console.log(`People needed for 50% odds: ${itemsNeededFor50Percent(365)}`);

// Same math, applied to a hash table
const hashSpace = 2 ** 16; // a 16-bit hash
console.log(`\n16-bit hash space needs only ~${itemsNeededFor50Percent(hashSpace)} items for a 50% collision chance`);

console.log(`Simulated collision found after ${findFirstCollision(16)} random 16-bit hashes`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) for the probability formula; O(√b) expected for the simulation | The exact formula multiplies n terms; the simulation is expected to hit a collision after roughly √b random draws by the birthday bound |
| **Space** | O(min(n, b)) | The simulation stores every distinct value seen so far in a set |

The exact formula is always correct but gets numerically painful for huge `b` (floating-point underflow). The `1.1774 × √b` approximation is what engineers actually use to size hash spaces, ID lengths, and hash digest widths.

---

## One Minute Insight

> **Collision resistance scales with the square root of your space, not the space itself.** If you want `k` bits of real collision resistance, your hash or ID needs `2k` bits of raw output — that "√2" tax is the birthday bound quietly showing up in every cryptographic hash size you've ever seen.

Next time someone says "there are trillions of possible IDs, collisions are basically impossible," ask them for the bucket count — then take its square root. That's your real budget before the pigeons start doubling up.

*Run `code.py` or `code.js` to see it in action.*
