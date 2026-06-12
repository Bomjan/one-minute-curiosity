# The Birthday Paradox: Why Hash Collisions Happen Sooner Than You Think

Put 23 random people in a room and there's a better-than-50% chance two share a birthday — out of 365 possible days. That same "surprisingly soon" math is quietly running underneath every hash table, session token, and UUID in your stack.

---

## The Problem

You're generating random IDs from a space of `d` possible values (days in a year, hash buckets, token strings — anything). Each time you generate a new ID, you check it against everything you've already made.

**Question:** How many IDs can you generate before two of them collide — and how does that number scale with `d`?

Intuition says "it should take close to `d` tries." The truth is far stranger: collisions become likely once you've made roughly **√d** picks, not `d` picks.

---

## Example

```
d = 365 (days in a year)

n = 23 people  →  P(collision) ≈ 50.7%
n = 50 people  →  P(collision) ≈ 97.0%
n = 70 people  →  P(collision) ≈ 99.9%
```

```
d = 16^6 = 16,777,216 (a 6-character hex ID space)

50% collision chance hits at roughly n ≈ 4,800 IDs
                                  (√16,777,216 ≈ 4,096)
```

Only a few thousand IDs — out of 16 million — and you're already a coin-flip away from a duplicate.

---

## Why It Matters

This isn't just a party trivia fact — it's a load-bearing concept across the stack:

| Domain | Real-World Impact |
| :--- | :--- |
| **Hashing / Hash tables** | Collisions appear long before the table is "full" — this is why load factor matters |
| **Cybersecurity** | Hash function attacks (birthday attacks) can find a collision in ~2^(n/2) work instead of 2^n |
| **Distributed systems** | Randomly generated node IDs, request IDs, or shard keys collide far sooner than intuition suggests |
| **Databases** | Short auto-generated keys (e.g. 6-char invite codes) run out of "safe" uniqueness fast |
| **Web engineering** | Session tokens and short URLs need enough entropy to survive millions of users, not thousands |

The takeaway: if you want collisions to stay rare, your ID space needs to be roughly the **square** of how many IDs you'll ever generate — not just "bigger than that number."

---

## Solution

### The Key Insight: Count the Pairs, Not the Items

With `n` items, there are roughly `n² / 2` *pairs* that could collide. Each pair collides with probability `1/d`. So the expected number of collisions is about:

```
n² / (2d)
```

This crosses 1 (i.e., "a collision is likely") when `n ≈ √(2d)` — which explains why the danger zone shows up at the square root of the space, not the space itself.

### Exact Formula

The exact probability that **no** collision happens among `n` picks from `d` options is:

```
P(no collision) = (d/d) × (d-1)/d × (d-2)/d × ... × (d-n+1)/d
```

So:

```
P(collision) = 1 - P(no collision)
```

### Step-by-Step Walkthrough

```
d = 365, n = 23

P(no collision) = (365/365) × (364/365) × ... × (343/365)
                ≈ 0.493

P(collision) = 1 - 0.493 = 0.507  →  50.7%
```

Multiply 23 fractions, each just slightly less than 1 — but multiplied together, they shrink fast.

---

## Code

### Python

```python
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


if __name__ == "__main__":
    days = 365
    print(f"P(collision) with 23 people: {collision_probability(23, days):.2%}")
    print(f"People needed for >50% chance: {picks_until_50_percent(days)}")

    hex_space = 16 ** 6
    print(f"\nIDs needed for >50% collision in a {hex_space:,}-value space: "
          f"{picks_until_50_percent(hex_space):,}")
```

### JavaScript

```javascript
function collisionProbability(n, d) {
    // Probability that at least 2 of n random picks from d options collide.
    if (n > d) return 1.0; // pigeonhole principle: guaranteed collision

    let probAllUnique = 1.0;
    for (let i = 0; i < n; i++) {
        probAllUnique *= (d - i) / d;
    }

    return 1 - probAllUnique;
}

function picksUntil50Percent(d) {
    // Smallest n where collision probability crosses 50%.
    let n = 1;
    while (collisionProbability(n, d) < 0.5) {
        n++;
    }
    return n;
}

const days = 365;
console.log(`P(collision) with 23 people: ${(collisionProbability(23, days) * 100).toFixed(2)}%`);
console.log(`People needed for >50% chance: ${picksUntil50Percent(days)}`);

const hexSpace = 16 ** 6;
console.log(`\nIDs needed for >50% collision in a ${hexSpace.toLocaleString()}-value space: ` +
            `${picksUntil50Percent(hexSpace).toLocaleString()}`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | Each probability calc multiplies n fractions; finding the 50% point scans n values |
| **Space** | O(1) | Just a running product — no storage needed |

For huge spaces (like a 128-bit UUID), you wouldn't loop — you'd use the `n ≈ 1.18 × √d` approximation directly. But the loop version makes the *why* visible.

---

## One Minute Insight

> **Square roots, not totals, govern collisions.** If you need `n` unique random IDs with low collision risk, your ID space needs roughly `n²` possible values — not `n`. This single fact is why UUIDs are 128 bits (not 32), why hash functions need large output sizes to resist birthday attacks, and why that "harmless" 6-character invite code will start colliding way sooner than your gut expects.

*Run `code.py` or `code.js` to see it in action.*
