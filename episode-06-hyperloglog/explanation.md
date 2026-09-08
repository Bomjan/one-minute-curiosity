# HyperLogLog: Counting to a Billion Without Counting

Ask a database "how many *unique* visitors hit the site today?" and it can answer instantly — even with a billion events — using barely more memory than a Tweet. The trick is to stop counting and start measuring coincidences.

---

## The Problem

You're watching a stream of user IDs — clicks, log lines, network packets — and you need to know how many **distinct** IDs have appeared. The obvious approach is a hash set: throw every ID in, let duplicates collide, read off the size.

That works, but the set grows with the data. A billion unique visitors means a set holding a billion strings — gigabytes of RAM, per metric, per day.

**Can you estimate the count of distinct items using a *fixed*, tiny amount of memory — regardless of whether the stream has a thousand items or a trillion?**

---

## Example

```
Stream: user-7, user-3, user-7, user-9, user-3, user-7, user-1, ...
        (40,000 truly distinct IDs, repeated across 100,000 events)

Exact hash-set count : 40,000   (memory: ~40,000 stored strings)
HyperLogLog estimate : 41,108   (memory: 1,024 tiny counters, a few bits each)

Error: ~2.8% — using a data structure that never grows past ~1 KB.
```

---

## Why It Matters

This isn't a party trick — it's load-bearing infrastructure:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `APPROX_COUNT_DISTINCT` in BigQuery, Redshift, Postgres extensions |
| **Caching / infra** | Redis's `PFCOUNT` / `PFADD` — this exact algorithm, built in |
| **Distributed systems** | Sketches from different shards merge with a simple max — no re-scanning data |
| **Networking** | Estimating unique flows or source IPs during traffic analysis |
| **AI / analytics** | De-duplicating training corpora or event streams at scale |

The deeper idea — trading a small, *provable* error rate for constant memory — is called **sketching**, and it's how modern systems answer questions over data too large to ever fully hold in memory.

---

## Solution

### The Key Insight: Rare Streaks Reveal Scale

Hash every item into a long random-looking bit string. Now ask: **what's the longest run of leading zeros you've seen?**

- Seeing `000...` (a few zeros) at the start of a hash is common.
- Seeing 15 zeros in a row is rare — it takes roughly 2^15 tries before one hash gets that lucky.

So if the *longest* leading-zero streak you've observed is `k`, a good guess is that you've hashed roughly **2^k** distinct items. One number, one estimate — but wildly noisy on its own (one lucky streak throws it off completely).

### Averaging Away the Luck

HyperLogLog fixes the noise with **stochastic averaging**:

1. Split each hash into two parts: a few bits pick one of `m` **buckets**, the rest of the bits are used to measure the leading-zero streak.
2. Each bucket keeps only the *longest* streak it has ever seen.
3. Combine all `m` bucket values with a harmonic mean (harmonic mean punishes outliers, keeping one lucky bucket from skewing the result) and a bias-correction constant.

More buckets = more independent "votes" = a tighter estimate. With `m = 1024` buckets, the expected error is about `1.04 / √1024 ≈ 3%` — matching what we saw above.

### Beginner-Friendly Walkthrough

```
1. Hash the item          → "user-7" → 101100010111...  (looks random)
2. First b bits = bucket  → 1011000101 → bucket #709
3. Remaining bits' streak → 0111...    → 1 leading zero → rho = 2
4. registers[709] = max(registers[709], 2)
... repeat for every item, updating only ONE register each time ...
5. Estimate = alpha * m^2 / sum(2^-registers[i] for all i)
```

No item is ever stored. Only `m` small integers exist, no matter how long the stream runs.

---

## Code

### Python

```python
import hashlib


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b
        self.m = 1 << b  # number of buckets, e.g. 1024 when b = 10
        self.registers = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash_bits(self, item):
        digest = hashlib.sha1(str(item).encode()).hexdigest()
        return bin(int(digest, 16))[2:].zfill(160)

    def add(self, item):
        bits = self._hash_bits(item)
        bucket = int(bits[: self.b], 2)
        rest = bits[self.b :]
        # rho = position of the first 1-bit (how long the leading-zero streak was)
        rho = len(rest) - len(rest.lstrip("0")) + 1
        self.registers[bucket] = max(self.registers[bucket], rho)

    def count(self):
        indicator = sum(2.0**-r for r in self.registers)
        estimate = self.alpha * (self.m**2) / indicator
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)
    true_unique = set()

    for i in range(100_000):
        user_id = f"user-{i % 40_000}"  # 40,000 real uniques, lots of repeats
        hll.add(user_id)
        true_unique.add(user_id)

    print("Actual unique:", len(true_unique))
    print("HLL estimate :", hll.count())
```

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b; // number of buckets, e.g. 1024 when b = 10
    this.registers = new Array(this.m).fill(0);
    this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
  }

  _hashBits(item) {
    const digest = crypto.createHash("sha1").update(String(item)).digest("hex");
    return BigInt("0x" + digest).toString(2).padStart(160, "0");
  }

  add(item) {
    const bits = this._hashBits(item);
    const bucket = parseInt(bits.slice(0, this.b), 2);
    const rest = bits.slice(this.b);
    const firstOne = rest.indexOf("1");
    // rho = position of the first 1-bit (how long the leading-zero streak was)
    const rho = (firstOne === -1 ? rest.length : firstOne) + 1;
    this.registers[bucket] = Math.max(this.registers[bucket], rho);
  }

  count() {
    const indicator = this.registers.reduce((sum, r) => sum + 2 ** -r, 0);
    const estimate = (this.alpha * this.m * this.m) / indicator;
    return Math.round(estimate);
  }
}

const hll = new HyperLogLog(10);
const trueUnique = new Set();

for (let i = 0; i < 100000; i++) {
  const userId = `user-${i % 40000}`; // 40,000 real uniques, lots of repeats
  hll.add(userId);
  trueUnique.add(userId);
}

console.log("Actual unique:", trueUnique.size);
console.log("HLL estimate :", hll.count());
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per item, O(n) for the stream | One hash, one bucket update — no matter how big the stream gets |
| **Space** | O(m), constant | `m` small registers (e.g. 1,024 counters of a few bits each) — never grows with the data |

Compare that to a hash set's `O(n)` space, and the trade is obvious: give up exactness, get memory that never grows.

---

## One Minute Insight

> **You don't need to remember everything to know how much there was.** A handful of "how lucky did this hash get" measurements, averaged carefully, approximates a count that would otherwise need every item held in memory.

This is the essence of sketching algorithms: replace **storage** with **statistics**. The same idea — trading exactness for a bounded, provable error and constant space — powers Bloom filters, Count-Min Sketch, and t-digest, and it's why "big data" systems can answer in milliseconds what naive counting never could.

*Run `code.py` or `code.js` to see the estimate land within a few percent of the true count.*
