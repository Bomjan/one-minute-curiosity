# Counting a Billion Things With 16 Bytes

Ask a database "how many *unique* visitors did we get today?" and it can answer instantly — even with a billion rows — without ever storing a single visitor ID. The trick is one of the most elegant hacks in computer science: **HyperLogLog**.

---

## The Problem

You want to count **distinct items** in a massive stream: unique visitors, unique search queries, unique IP addresses hitting your API.

The exact way is a `set()` — store every unique item you've seen. But if you're Twitter counting unique tweet-viewers, that set could hold hundreds of millions of entries and eat gigabytes of RAM.

**Can you estimate the count of unique items using a *fixed*, tiny amount of memory — say, a few kilobytes — no matter how many items you've seen?**

---

## Example

```
Stream: ["alice", "bob", "alice", "carol", "bob", "dave", "alice"]
Exact unique count: 4 (alice, bob, carol, dave)

HyperLogLog estimate: ~4-5  (using only 16 tiny counters)
```

```
Stream: 1,000,000 random unique user IDs
Exact unique count: 1,000,000  (needs ~8 MB to store as a set)

HyperLogLog estimate: ~988,000  (needs ~16 KB — 500x less memory)
```

The estimate is off by about 2%. For most analytics dashboards, that trade is a steal.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Redis's `PFCOUNT`/`PFADD` runs HyperLogLog under the hood |
| **Analytics** | "Unique visitors today" on any large-scale dashboard |
| **Networking** | Estimating distinct flows or source IPs during a DDoS |
| **Distributed systems** | Per-shard estimates merge into one global count with zero coordination |
| **Databases (query planning)** | Postgres/BigQuery use similar sketches to estimate `COUNT(DISTINCT ...)` |

The deeper lesson: **when a question only needs an approximate answer, you can trade exactness for a massive drop in memory** — often turning an O(n)-space problem into an O(1)-space one.

---

## Solution

### The Key Insight: Rare Patterns Reveal Scale

Flip a fair coin repeatedly and watch for a run of consecutive heads. A run of length `k` should only appear, on average, once every `2^k` flips. So if you've *seen* a run of 10 heads in a row, you've probably flipped the coin around `2^10 = 1024` times — even though you never counted the flips directly.

HyperLogLog applies this exact idea to counting unique items:

1. **Hash each item** into a random-looking bit string.
2. **Split the hash in two**: a few bits pick one of `m` "buckets" (registers), the rest of the bits are scanned for their **leading zero run length**.
3. **Each register keeps the longest run of leading zeros** it has ever seen for items landing in it.
4. **Longer runs imply more distinct items** landed in that bucket — because leading-zero runs of length `k` should only occur once every `2^k` hashes.
5. **Average across all buckets** (using a harmonic mean, which resists outliers) to get the final estimate.

Using `m` buckets instead of one dramatically reduces variance — one lucky long run doesn't wreck the whole estimate.

One catch: when very few items have been seen, most buckets stay empty and the raw formula overestimates. The classic fix (from the original Flajolet et al. paper) is to fall back to **linear counting** — based on how many buckets are *still* empty — whenever the raw estimate is small relative to `m`.

### Step-by-Step Walkthrough

```
Item "alice" → hash → 0110 1011 0001...
  first 4 bits (0110 = 6) → pick bucket 6
  remaining bits (1011 0001...) → leading zeros = 0 → run length 1
  registers[6] = max(registers[6], 1)

Item "bob" → hash → 0110 0001 1101...
  first 4 bits (0110 = 6) → pick bucket 6 (same bucket!)
  remaining bits (0001 1101...) → leading zeros = 3 → run length 4
  registers[6] = max(1, 4) = 4

...repeat for every item, across all 16 buckets...

Final estimate = alpha * m^2 / sum(2^-register[i] for all buckets)
```

No item is ever stored. Only 16 (or 1024, or however many) small integers ever exist in memory.

---

## Code

### Python

```python
import hashlib
import math

HASH_BITS = 32

def _hash(item):
    """Deterministic 32-bit hash of an item."""
    digest = hashlib.md5(str(item).encode()).hexdigest()
    return int(digest[:8], 16)

def _leading_zeros(x, bits):
    """Count leading zero bits in a `bits`-wide integer."""
    if x == 0:
        return bits
    count = 0
    for i in range(bits - 1, -1, -1):
        if (x >> i) & 1:
            break
        count += 1
    return count

def hyperloglog_estimate(items, b=4):
    """Estimate the number of distinct items using 2^b registers."""
    m = 2 ** b
    registers = [0] * m
    remainder_bits = HASH_BITS - b

    for item in items:
        h = _hash(item)
        bucket = h & (m - 1)          # last b bits choose the register
        remainder = h >> b            # remaining bits get scanned
        run_length = _leading_zeros(remainder, remainder_bits) + 1
        registers[bucket] = max(registers[bucket], run_length)

    alpha = 0.7213 / (1 + 1.079 / m)  # standard bias-correction constant
    raw_estimate = alpha * m * m / sum(2 ** -r for r in registers)

    # Small-cardinality correction: fall back to linear counting when
    # most registers are still empty (Flajolet et al.)
    empty_registers = registers.count(0)
    if raw_estimate <= 2.5 * m and empty_registers > 0:
        raw_estimate = m * math.log(m / empty_registers)

    return round(raw_estimate)


if __name__ == "__main__":
    small_stream = ["alice", "bob", "alice", "carol", "bob", "dave", "alice"]
    print(f"Small stream estimate: {hyperloglog_estimate(small_stream)}")  # ~4-5

    big_stream = [f"user-{i}" for i in range(1_000_000)]
    print(f"Big stream estimate: {hyperloglog_estimate(big_stream, b=10)}")  # ~1,000,000
```

### JavaScript

```javascript
function fnv1aHash(str) {
    // Deterministic 32-bit hash of a string
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // force unsigned 32-bit
}

const HASH_BITS = 32;

function leadingZeros(x, bits) {
    if (x === 0) return bits;
    let count = 0;
    for (let i = bits - 1; i >= 0; i--) {
        if ((x >> i) & 1) break;
        count++;
    }
    return count;
}

function hyperLogLogEstimate(items, b = 4) {
    const m = 1 << b;
    const registers = new Array(m).fill(0);
    const remainderBits = HASH_BITS - b;

    for (const item of items) {
        const h = fnv1aHash(String(item));
        const bucket = h & (m - 1);        // last b bits choose the register
        const remainder = h >>> b;         // remaining bits get scanned
        const runLength = leadingZeros(remainder, remainderBits) + 1;
        registers[bucket] = Math.max(registers[bucket], runLength);
    }

    const alpha = 0.7213 / (1 + 1.079 / m);
    const sumInverses = registers.reduce((acc, r) => acc + Math.pow(2, -r), 0);
    let estimate = (alpha * m * m) / sumInverses;

    // Small-cardinality correction: fall back to linear counting when
    // most registers are still empty (Flajolet et al.)
    const emptyRegisters = registers.filter((r) => r === 0).length;
    if (estimate <= 2.5 * m && emptyRegisters > 0) {
        estimate = m * Math.log(m / emptyRegisters);
    }

    return Math.round(estimate);
}

const smallStream = ["alice", "bob", "alice", "carol", "bob", "dave", "alice"];
console.log(`Small stream estimate: ${hyperLogLogEstimate(smallStream)}`); // ~4-5

const bigStream = Array.from({ length: 1_000_000 }, (_, i) => `user-${i}`);
console.log(`Big stream estimate: ${hyperLogLogEstimate(bigStream, 10)}`); // ~1,000,000
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | One hash + one comparison per item, regardless of how many are duplicates |
| **Space** | O(m) ≈ O(1) | Only `m` small registers exist — completely independent of stream length `n` |

A `set()` scales its memory with the number of *unique* items. HyperLogLog's memory is **fixed** — 16 KB of registers can estimate cardinalities from a hundred to a hundred billion, at roughly 2% error either way.

---

## One Minute Insight

> **You don't need to remember everything to know how much there was.** HyperLogLog counts by noticing how *rare* an event was, not by tallying occurrences — the rarer the pattern you observe, the bigger the population that must have produced it.

This is the same trick behind estimating a crowd's size from the tallest person you spot, or guessing a deck has been shuffled many times because you saw an unlikely sequence. When exact counting is too expensive, look for *rarity as a signal* — it's often cheaper than counting could ever be.

*Run `code.py` or `code.js` to see it in action.*
