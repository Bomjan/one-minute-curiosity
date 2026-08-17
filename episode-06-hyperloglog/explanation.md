# Counting to a Billion Without Counting

Ask a database "how many *unique* visitors did we have today?" and it has two options: remember every single visitor ID, or lie a little. HyperLogLog is the algorithm that lies — on purpose, by less than 2% — and gets away with using almost no memory at all.

---

## The Problem

You're watching a firehose of events: page views, IP addresses, search queries, whatever. You need to answer one question — **how many distinct items have I seen?**

The obvious approach is a `set()`: insert every item, read off the size. It's exact, but it's also O(n) *memory* — a billion unique visitors means a set holding a billion entries. At web scale, that's the difference between a script and a server fire.

**Your goal:** estimate the distinct count using memory that stays flat, whether you've seen a thousand items or a trillion.

---

## Example

```
Stream: 100,000 events, but only 5,000 truly unique visitor IDs
  ["visitor-1", "visitor-2", ..., "visitor-4999", "visitor-0", "visitor-1", ...]

Exact answer (a Python set):      5000   →  needs O(5000) memory
HyperLogLog estimate (1024 regs): 5129   →  needs O(1024) memory, always

Error: 2.58% — and that memory footprint (4KB) never grows,
even if the stream had 5 billion events instead of 100,000.
```

---

## Why It Matters

This exact trick is running in production right now:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `SELECT APPROX_COUNT_DISTINCT(...)` in Redis, BigQuery, Postgres |
| **Analytics** | "Unique visitors today" dashboards that can't afford exact sets |
| **Networking** | Estimating distinct flows/IPs on a router without full packet logs |
| **Distributed systems** | Merging cardinality estimates across shards — registers just take the max |
| **Big data** | Counting distinct elements in streams too large to ever fit in RAM |

The deeper lesson: **when "exact" is too expensive, a small, provable amount of error can buy you a constant-memory algorithm.** Probabilistic data structures (HyperLogLog, Bloom filters, Count-Min Sketch) all trade a controlled sliver of accuracy for orders of magnitude less memory.

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly and count how many flips until you get heads. Getting heads on flip 1 is common. Getting heads only after 20 flips is *rare* — and the longer that streak, the more flips you'd guess were attempted overall.

HyperLogLog applies the same idea to hashing:

1. Hash every item to a random-looking bit string.
2. Look at the **run of leading zeros** in that hash. A run of `k` zeros happens with probability `1/2^k` — rare runs imply you've hashed *many* distinct items.
3. Track the **longest run seen** as your signal for "roughly how many distinct items."

One hash alone is noisy, so split the work across `m` independent **registers**: use the first few bits of the hash to pick a register (0 to m-1), and store the longest zero-run seen *by that register* using the remaining bits. Averaging (via harmonic mean) across all `m` registers cancels out the noise.

### Step-by-Step Walkthrough

```
1. Hash the item → a 32-bit number.
2. Use the last b bits as the register index j        (m = 2^b registers)
3. Use the remaining bits to count leading zeros + 1   (call it rho)
4. registers[j] = max(registers[j], rho)
5. After the stream ends, combine all registers:
     estimate = alpha_m * m^2 / sum(2^-registers[i] for i in registers)
```

Duplicates are automatically harmless — the same item always hashes the same way and updates the same register with the same value, so re-seeing it changes nothing. That's what makes this a *distinct*-count estimator with a single pass and no lookup table.

---

## Code

### Python

```python
import math


def hash32(s):
    """Deterministic 32-bit hash (FNV-1a + a finalizer for a clean avalanche)."""
    h = 0x811C9DC5
    for byte in s.encode():
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return h


def rho(w, width):
    """Position of the leftmost 1-bit in a `width`-bit number (1-indexed)."""
    if w == 0:
        return width + 1
    return width - w.bit_length() + 1


def hyperloglog_estimate(stream, b=4):
    """Estimate the number of distinct items in `stream` using 2**b registers."""
    m = 1 << b
    registers = [0] * m
    tail_width = 32 - b

    for item in stream:
        x = hash32(str(item))
        j = x & (m - 1)          # last b bits pick a register
        w = x >> b                # remaining bits measure a "run of zeros"
        registers[j] = max(registers[j], rho(w, tail_width))

    alpha = 0.673 if m == 16 else 0.7213 / (1 + 1.079 / m)
    raw_estimate = alpha * m * m / sum(2 ** -r for r in registers)

    # small-cardinality correction (linear counting)
    if raw_estimate <= 2.5 * m:
        zero_registers = registers.count(0)
        if zero_registers:
            return round(m * math.log(m / zero_registers))

    return round(raw_estimate)


if __name__ == "__main__":
    stream = [f"visitor-{i % 5000}" for i in range(100_000)]
    print(len(set(stream)))                      # exact: 5000
    print(hyperloglog_estimate(stream, b=10))     # estimate: ~5000, using 4KB
```

### JavaScript

```javascript
function hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

function rho(w, width) {
    if (w === 0) return width + 1;
    return width - (31 - Math.clz32(w));
}

function hyperloglogEstimate(stream, b = 4) {
    const m = 1 << b;
    const registers = new Array(m).fill(0);
    const tailWidth = 32 - b;

    for (const item of stream) {
        const x = hash32(String(item));
        const j = x & (m - 1);
        const w = x >>> b;
        registers[j] = Math.max(registers[j], rho(w, tailWidth));
    }

    const alpha = m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / m);
    const sumInverse = registers.reduce((acc, r) => acc + 2 ** -r, 0);
    const rawEstimate = (alpha * m * m) / sumInverse;

    if (rawEstimate <= 2.5 * m) {
        const zeroRegisters = registers.filter((r) => r === 0).length;
        if (zeroRegisters) return Math.round(m * Math.log(m / zeroRegisters));
    }

    return Math.round(rawEstimate);
}

const stream = Array.from({ length: 100000 }, (_, i) => `visitor-${i % 5000}`);
console.log(new Set(stream).size);            // exact: 5000
console.log(hyperloglogEstimate(stream, 10)); // estimate: ~5000, using 4KB
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | One hash + O(1) register update per item, single pass |
| **Space** | O(m) = O(2^b) | Fixed number of registers — **independent of n** |

That last row is the whole point: a real-world HyperLogLog uses `b = 14` (16,384 registers, ~16KB) and estimates cardinalities in the *billions* within roughly 0.8% standard error. Whether the stream has a thousand events or a trillion, the memory footprint never changes.

---

## One Minute Insight

> **You don't need to remember everything to know how much you've seen — you just need to notice the rarest thing that happened.**

Exact counting scales with data; HyperLogLog scales with *precision you choose*. That's the shift probabilistic data structures make possible: pick your error tolerance once, pay a fixed memory price forever. The next time a dashboard says "approximately," this is probably why — and it's a feature, not a shortcut.

*Run `code.py` or `code.js` to see it in action.*
