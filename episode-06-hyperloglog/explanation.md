# Counting a Billion Things With 1.5 KB of Memory

Ask a database "how many *distinct* visitors hit the site today?" and the naive answer is: store every visitor ID in a set, then count it. That works fine for a million visitors. It falls over completely at a billion — the set alone could cost gigabytes of RAM. **HyperLogLog** answers the same question using a fixed handful of kilobytes, and is only ever off by about 2%.

---

## The Problem

You're watching a firehose of events — page views, IP addresses, search queries — and someone asks: "how many *unique* things went by?"

Storing everything to answer this exactly doesn't scale. You need an estimate that:
- uses **constant memory**, regardless of how many events arrive
- processes each event in **O(1)** time
- stays accurate within a few percent

**Input / Output Example**

```
Stream: 1,000,000 events, but only 50,000 truly distinct values

Exact count (using a Set):        50,000   (needs ~2 MB of memory)
HyperLogLog estimate (1024 buckets): 52,175   (needs ~1 KB of memory)

Error: ~4%          Memory saved: ~2000x
```

---

## Why It Matters

| Use case | Where HyperLogLog lives |
| :--- | :--- |
| **Databases** | Redis `PFCOUNT`, PostgreSQL `HLL` extension |
| **Analytics** | Counting unique visitors, unique searches at scale |
| **Big data** | Google BigQuery `APPROX_COUNT_DISTINCT` |
| **Networking** | Estimating unique flows/IPs in traffic monitoring |
| **Distributed systems** | Mergeable — combine counts from many machines with no extra error |

Anywhere "roughly how many unique X" beats "exactly how many, but slowly," HyperLogLog shows up.

---

## Solution

**The core insight:** if you flip a fair coin repeatedly, the length of the longest run of heads-in-a-row tells you *how many times you flipped*, even if you never counted. Flip a coin 3 times before your first tails? Probably didn't flip many times. Flip it 20 times before a tails? You probably flipped a lot.

HyperLogLog turns hashing into "coin flips":

1. **Hash each item.** A good hash makes the bits look random — like coin flips.
2. **Split the hash in two:** a few bits pick one of `m` "buckets" (like sorting flips into `m` separate coin jars), the rest of the bits are used to count the **leading zeros** (a proxy for a run of consecutive "tails").
3. **Each bucket remembers only its longest run of leading zeros ever seen.** One integer per bucket — that's the *entire* memory footprint.
4. **To estimate the count**, harmonic-average the buckets together with a correction constant. Buckets that saw longer zero-runs suggest more distinct items passed through *that* bucket, and averaging across all `m` buckets smooths out the randomness.

**Why does this work?** With `m` buckets, you get `m` independent "biggest run of leading zeros" experiments running in parallel. Averaging them cancels out individual noise, and the error shrinks as roughly `1.04 / √m`. With 1024 buckets (2KB), you get ~3% error. With 16,384 buckets (32KB), you get under 1% — count a *billion* unique items with less memory than a single JPEG thumbnail.

---

## Code

### Python

```python
import hashlib

def _hash(item):
    digest = hashlib.md5(str(item).encode()).hexdigest()
    return int(digest[:8], 16)

def _leading_zero_run(bits, width):
    binary = format(bits, f"0{width}b")
    return len(binary) - len(binary.lstrip("0")) + 1

class HyperLogLog:
    def __init__(self, b=10):
        self.b = b
        self.m = 1 << b
        self.buckets = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def add(self, item):
        x = _hash(item)
        bucket_index = x & (self.m - 1)
        rank = _leading_zero_run(x >> self.b, 32 - self.b)
        self.buckets[bucket_index] = max(self.buckets[bucket_index], rank)

    def count(self):
        raw = self.alpha * self.m * self.m / sum(2 ** -r for r in self.buckets)
        return round(raw)
```

### JavaScript

```javascript
const crypto = require("crypto");

function hash(item) {
    const digest = crypto.createHash("md5").update(String(item)).digest("hex");
    return parseInt(digest.slice(0, 8), 16);
}

function leadingZeroRun(bits, width) {
    const binary = bits.toString(2).padStart(width, "0");
    return binary.length - binary.replace(/^0+/, "").length + 1;
}

class HyperLogLog {
    constructor(b = 10) {
        this.b = b;
        this.m = 1 << b;
        this.buckets = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m);
    }

    add(item) {
        const x = hash(item);
        const bucketIndex = x & (this.m - 1);
        const rank = leadingZeroRun(x >>> this.b, 32 - this.b);
        this.buckets[bucketIndex] = Math.max(this.buckets[bucketIndex], rank);
    }

    count() {
        const sumInverse = this.buckets.reduce((acc, r) => acc + 2 ** -r, 0);
        return Math.round((this.alpha * this.m * this.m) / sumInverse);
    }
}
```

*Full runnable versions with a demo stream are in `code.py` and `code.js`.*

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(1) per item added, O(m) to compute the final estimate |
| **Space** | O(m) — a few KB, completely independent of stream length |

Whether the stream has a thousand events or a trillion, memory usage never changes. That's the entire trick.

---

## One Minute Insight

> **You don't need to remember what you saw — you need to remember the most surprising thing you saw.** HyperLogLog throws away every item's identity and keeps only the rarest pattern each bucket has stumbled into. Rarity, it turns out, is a remarkably good stand-in for scale.

*Check `code.py` and `code.js` to run this experiment yourself!*
