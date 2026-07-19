# Counting to a Billion Without Counting

Imagine tracking how many *unique* visitors hit your website today. Simple — until "today" means a billion events and you can't afford to remember every visitor you've ever seen. There's a trick that estimates that count using less memory than a single tweet.

---

## The Problem

You're watching a massive stream of items — IP addresses, user IDs, search queries — and you need to answer one question: **how many distinct items have I seen?**

The obvious approach is a hash set: store every unique item, check `len(set)`. It's exact, but it scales with the data. A billion unique 64-bit IDs means gigabytes of RAM just to answer one number.

**Your goal:** Estimate the count of distinct items using a *fixed*, tiny amount of memory — even if the stream has billions of entries — and accept a small, predictable error in exchange.

This is the **cardinality estimation** problem, and **HyperLogLog** solves it with a few kilobytes and a clever observation about coin flips.

---

## Example

```
Stream: user_1, user_2, user_1, user_3, user_2, user_4, user_1, ...
        (1,000,000 truly unique users, with heavy repetition)

Exact answer (hash set):      1,000,000 items, ~megabytes of memory
HyperLogLog (4096 registers): ~1,022,921 estimate, ~4 KB of memory

Error: 2.29% — using roughly 1/250,000th the memory.
```

---

## Why It Matters

Cardinality estimation shows up anywhere "how many *distinct* things" matters at scale:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `SELECT COUNT(DISTINCT user_id)` on billions of rows (Postgres, Redis `PFCOUNT`) |
| **Analytics** | Unique visitor counts across ad networks and web dashboards |
| **Networking** | Counting distinct source IPs during a traffic spike or DDoS |
| **Distributed systems** | Estimating unique keys across sharded caches without a global scan |
| **Big data / AI** | De-duplication and dataset-size estimation over streaming pipelines |

The deeper lesson: **you don't need perfect memory to get a trustworthy answer — you need to know how rare the thing you just saw was.**

---

## Solution

### The Key Insight: Rare Patterns Reveal Scale

Flip a fair coin until you get heads. Getting heads on flip 1 is common. Getting heads for the first time on flip 20 is rare — and the *more* items you've flipped through, the more likely you are to have witnessed that rare streak somewhere.

HyperLogLog turns every item into a coin-flip sequence by hashing it into a random-looking bit string, then measuring **how many leading zeros** appear before the first `1` bit. A long run of zeros is a low-probability event — seeing one is evidence that *many* distinct items have been hashed, because rare events need volume to show up.

One hash alone is noisy — a single lucky item could fake a huge run. So HyperLogLog splits work across many independent "buckets":

1. Hash each item into a 64-bit number.
2. Use the first `p` bits to pick one of `2^p` **registers** (buckets).
3. Use the remaining bits to compute the **rank**: 1 + count of leading zeros.
4. Store the *maximum* rank ever seen in that register.
5. To estimate the total count, take the **harmonic mean** across all registers (harmonic mean punishes outliers, keeping one lucky bucket from skewing the result) and apply a bias-correction constant.

### Step-by-Step Walkthrough

```
precision = 12 → 4096 registers, each storing one small integer (a "rank")
Memory: 4096 registers × ~1 byte ≈ 4 KB — regardless of stream size!

For each item:
  hash → 64 bits
  bucket = first 12 bits         (which of 4096 registers to update)
  remaining = last 52 bits
  rank = leading_zeros(remaining) + 1
  registers[bucket] = max(registers[bucket], rank)

To estimate:
  combine all 4096 registers with a harmonic mean
  multiply by a correction constant (alpha) and num_registers²
  → estimated unique count
```

More registers (higher precision) means smaller error but more memory — a direct, tunable trade-off between accuracy and space.

---

## Code

### Python

```python
def hyperloglog_count(items, precision=12):
    import hashlib

    num_registers = 1 << precision
    registers = [0] * num_registers
    alpha = 0.7213 / (1 + 1.079 / num_registers)

    for item in items:
        h = int.from_bytes(hashlib.sha1(item.encode()).digest()[:8], "big")
        bucket = h >> (64 - precision)
        remaining_bits = 64 - precision
        remaining = h & ((1 << remaining_bits) - 1)
        rank = remaining_bits - remaining.bit_length() + 1
        registers[bucket] = max(registers[bucket], rank)

    raw_estimate = alpha * num_registers ** 2 / sum(2 ** -r for r in registers)
    return round(raw_estimate)


if __name__ == "__main__":
    stream = [f"user_{i % 1_000_000}" for i in range(3_000_000)]  # lots of repeats
    print(hyperloglog_count(stream))  # ~1,000,000, using ~4 KB of state
```

### JavaScript

```javascript
const crypto = require("crypto");

function hyperloglogCount(items, precision = 12) {
    const numRegisters = 1 << precision;
    const registers = new Uint8Array(numRegisters);
    const alpha = 0.7213 / (1 + 1.079 / numRegisters);

    for (const item of items) {
        const h = crypto.createHash("sha1").update(item).digest().readBigUInt64BE(0);
        const bucket = Number(h >> BigInt(64 - precision));
        const remainingBits = 64 - precision;
        const remaining = h & ((1n << BigInt(remainingBits)) - 1n);

        let rank = 1;
        for (let i = remainingBits - 1; i >= 0; i--) {
            if ((remaining >> BigInt(i)) & 1n) break;
            rank++;
        }
        registers[bucket] = Math.max(registers[bucket], rank);
    }

    let sum = 0;
    for (const r of registers) sum += 2 ** -r;
    return Math.round((alpha * numRegisters ** 2) / sum);
}

const stream = Array.from({ length: 3_000_000 }, (_, i) => `user_${i % 1_000_000}`);
console.log(hyperloglogCount(stream)); // ~1,000,000, using ~4 KB of state
```

*(See `code.py` and `code.js` in this folder for the full, reusable class versions with a benchmark against an exact count.)*

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | One hash + one register update per incoming item |
| **Space** | O(2^p) | Fixed number of registers (`p` = precision), independent of stream size |

With `p = 12` (4096 registers), the standard error is about `1.04 / sqrt(4096) ≈ 1.6%` — and that error **never grows**, no matter whether the stream has a million or a trillion items. Compare that to a hash set, whose memory grows linearly forever.

---

## One Minute Insight

> **You don't have to remember everything to know how much you've seen — just the rarest pattern you've encountered.** HyperLogLog trades perfect recall for a probabilistic guarantee, and gets a 250,000x memory reduction for roughly 2% error.

This is the same trade-off that shows up throughout systems engineering: Bloom filters trade certainty of presence for compactness, sampling trades completeness for speed, and HyperLogLog trades exact counts for a bounded, tunable error. When "close enough" is genuinely enough, throwing away the right information is a feature, not a bug.

*Run `code.py` or `code.js` to see it in action.*
