# Counting to a Billion With a Coin Flip

How does Redis tell you "12,400,318 unique visitors" while storing the number in less space than a tweet? The answer is a beautifully sneaky trick involving coin flips and bad luck.

---

## The Problem

You're watching a firehose of website visitor IDs stream past — billions of them, with massive duplication. Someone asks: **"How many *unique* visitors did we see?"**

The obvious answer is a `Set`: add every ID, return the size. It's exact. It's also a memory disaster — a billion unique 64-bit IDs needs **gigabytes** of RAM just to answer one number.

**Your goal:** Estimate the count of distinct items in a massive stream using a *fixed, tiny* amount of memory — a few kilobytes, no matter if the stream has a thousand items or a trillion.

You're allowed to be approximately right (within ~2% error). You are not allowed to store the items themselves.

---

## Example

```
Stream: visitor_42, visitor_7, visitor_42, visitor_99, visitor_7, visitor_3, ...
        (3.2 million events, 480,000 of them unique)

Exact answer (using a Set):        480,000   →  costs ~4 GB of RAM
HyperLogLog estimate:              478,221   →  costs   ~1 KB of RAM
```

Same ballpark answer. Four million times less memory.

---

## Why It Matters

Cardinality estimation is everywhere once you start looking:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `APPROX_COUNT_DISTINCT` in BigQuery, Redis `PFCOUNT` |
| **Networking** | Counting distinct flows/IPs hitting a router without per-packet storage |
| **Cybersecurity** | Estimating unique attacker IPs in a DDoS without OOM-ing the logger |
| **Web Analytics** | "Unique visitors today" dashboards at internet scale |
| **Distributed Systems** | Merging cardinality estimates across shards with simple math (no recount needed) |

The deeper lesson: **you don't need exact data to answer a statistical question — you need the *right signal*, captured cheaply.**

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly and count flips until you get heads. Getting heads on flip 1 is common. Getting heads only after **20 flips in a row of tails** is rare — it takes about a million tries before *anyone* sees that.

So: if you hash every item into a random-looking bit string and track **the longest run of leading zero bits ever seen**, that longest run tells you roughly how many *distinct* items you hashed — because seeing a long run of zeros is rare, and rare events need a big sample size to occur.

One observation is noisy, though. So HyperLogLog hashes each item, uses a few of its bits to pick one of `m` buckets (like splitting your data into `m` independent experiments), and tracks the longest zero-run *per bucket*. Averaging across buckets cancels out the noise.

### Step-by-Step Walkthrough

```
1. Pick m buckets (e.g., 16).
2. For each item:
     hash = hash(item)                     → spreads items uniformly
     bucket = first log2(m) bits of hash    → picks one of the 16 experiments
     rank = count of leading zeros in the rest of hash, plus 1
     registers[bucket] = max(registers[bucket], rank)
3. Estimate = alpha_m * m^2 / sum(2^-registers[j] for j in registers)
```

Each register remembers only "the rarest pattern I've seen" — one small integer. 16 registers, 16 small integers, regardless of whether you fed it 100 items or 100 billion.

---

## Code

### Python

```python
import hashlib


class HyperLogLog:
    HASH_BITS = 128  # an MD5 digest is 128 bits wide

    def __init__(self, num_buckets=16):
        self.m = num_buckets
        self.bucket_bits = num_buckets.bit_length() - 1   # log2(m), m must be a power of 2
        self.value_bits = self.HASH_BITS - self.bucket_bits
        self.registers = [0] * num_buckets

    def _hash(self, item):
        digest = hashlib.md5(str(item).encode()).hexdigest()
        return int(digest, 16)

    def add(self, item):
        h = self._hash(item)
        bucket = h & (self.m - 1)              # low bits pick the bucket
        rest = h >> self.bucket_bits            # remaining value_bits-wide number
        leading_zeros = self.value_bits - rest.bit_length()
        rank = leading_zeros + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def estimate(self):
        alpha = 0.7213 / (1 + 1.079 / self.m)
        raw = alpha * self.m**2 / sum(2.0 ** -r for r in self.registers)
        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(num_buckets=64)
    true_unique = set()

    for i in range(50_000):
        visitor = f"user-{i % 12000}"          # only 12,000 truly unique
        hll.add(visitor)
        true_unique.add(visitor)

    print("Exact count: ", len(true_unique))
    print("HLL estimate:", hll.estimate())
```

### JavaScript

```javascript
const crypto = require("crypto");

const HASH_BITS = 128; // an MD5 digest is 128 bits wide

class HyperLogLog {
    constructor(numBuckets = 16) {
        this.m = numBuckets;
        this.bucketBits = Math.log2(numBuckets); // m must be a power of 2
        this.valueBits = HASH_BITS - this.bucketBits;
        this.registers = new Array(numBuckets).fill(0);
    }

    _hash(item) {
        const digest = crypto.createHash("md5").update(String(item)).digest("hex");
        return BigInt("0x" + digest);
    }

    _bitLength(value) {
        let length = 0;
        while (value > 0n) {
            value >>= 1n;
            length++;
        }
        return length;
    }

    add(item) {
        const h = this._hash(item);
        const bucket = Number(h & BigInt(this.m - 1));   // low bits pick the bucket
        const rest = h >> BigInt(this.bucketBits);        // remaining valueBits-wide number
        const leadingZeros = this.valueBits - this._bitLength(rest);
        const rank = leadingZeros + 1;
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    estimate() {
        const alpha = 0.7213 / (1 + 1.079 / this.m);
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        return Math.round((alpha * this.m ** 2) / sum);
    }
}

const hll = new HyperLogLog(64);
const trueUnique = new Set();

for (let i = 0; i < 50000; i++) {
    const visitor = `user-${i % 12000}`;  // only 12,000 truly unique
    hll.add(visitor);
    trueUnique.add(visitor);
}

console.log("Exact count: ", trueUnique.size);
console.log("HLL estimate:", hll.estimate());
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per item | One hash + one bucket update, regardless of stream size |
| **Space** | O(m) | Fixed number of small registers (e.g., 16 KB total, even for trillions of items) |

A hash `Set` is O(n) in space and grows forever. HyperLogLog is O(1) in space and **never grows**, trading a small, predictable error (~1.04/√m) for a memory bound that doesn't care how big your data gets.

---

## One Minute Insight

> **You don't need to remember everything to know roughly how much of it there was.** The rarest thing you've witnessed is a clue about how much you've witnessed in total — that's the whole trick.

This is the same intuition behind the German Tank Problem (estimating production totals from serial numbers) and birthday-paradox-style reasoning in cryptography: **extremes leak information about scale.** Once you start looking for the signal hidden in "the most unusual thing I saw," entire classes of impossible-seeming estimation problems become a few lines of code.

*Run `code.py` or `code.js` to see it in action.*
