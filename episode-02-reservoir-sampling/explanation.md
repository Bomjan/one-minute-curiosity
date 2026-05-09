# Fair Sampling from an Infinite Stream

You have a live data stream — logs, tweets, IoT events — that never ends. At any point you want exactly **K items** that represent a *fair random sample*: every item seen so far must have an equal probability of being chosen. You cannot store the whole stream.

This is the **Reservoir Sampling** problem, and the solution is beautifully simple.

---

## The Problem

Imagine reading a fire-hose of server logs. Your boss wants a random sample of 1,000 entries *at any moment*, but the log stream is effectively infinite and you only have memory for those 1,000 slots.

How do you guarantee every log line ever seen has the same chance of ending up in your sample?

**Input / Output Example**

```
Stream:  [A, B, C, D, E, F, G, ...]   (unbounded)
K = 3

After 3 items  → reservoir: [A, B, C]   (each with probability 3/3 = 100%)
After 4 items  → reservoir might be [A, D, C]  (each item has exactly 3/4 chance)
After 5 items  → each item has exactly 3/5 chance of being in the sample
After n items  → each item has exactly K/n chance — always.
```

---

## Why It Matters

| Use case | Where reservoir sampling lives |
| :--- | :--- |
| **Databases** | PostgreSQL / BigQuery `TABLESAMPLE BERNOULLI` |
| **Stream analytics** | Kafka consumers, Spark Streaming, Flink |
| **A/B testing** | Consistent user sampling without full dataset scans |
| **Distributed tracing** | Tail-based sampling of traces (Jaeger, Tempo) |
| **ML pipelines** | Online dataset shuffling without loading everything |

---

## The Logic (Algorithm R — Vitter, 1985)

1. **Fill the reservoir**: Take the first `K` items directly. The reservoir is now full.
2. **For each new item `i`** (where `i` starts at `K+1`):
   - Pick a random integer `j` in the range `[0, i)`.
   - If `j < K`, replace `reservoir[j]` with the new item.
   - Otherwise, discard the new item.
3. **Stop whenever you want.** The reservoir always holds a fair sample.

**Why is it fair?** Every element has probability `K/n` of surviving into the final sample of `n` items — provable by induction. The random replacement step ensures older items are gradually evicted with exactly the right probability.

---

## Solution

**Walkthrough with K=2, stream = [A, B, C, D, E]:**

```
i=0: reservoir = [A]
i=1: reservoir = [A, B]          ← reservoir full

i=2 (item C): j = random(0,3) = 1  → j < K → replace reservoir[1] → [A, C]
i=3 (item D): j = random(0,4) = 3  → j >= K → discard D
i=4 (item E): j = random(0,5) = 0  → j < K → replace reservoir[0] → [E, C]

Final sample: [E, C]
```

Each of A, B, C, D, E had exactly 2/5 = 40% probability of being in the result.

---

## Code

### Python

```python
import random

def reservoir_sample(stream, k):
    reservoir = []

    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randint(0, i)  # inclusive on both ends
            if j < k:
                reservoir[j] = item

    return reservoir


# Simulate an infinite-ish stream
if __name__ == "__main__":
    stream = range(1, 10_001)   # 10,000 items
    sample = reservoir_sample(stream, k=5)
    print("Random sample of 5 from 10,000 items:", sample)
```

### JavaScript

```javascript
function reservoirSample(stream, k) {
    const reservoir = [];

    let i = 0;
    for (const item of stream) {
        if (i < k) {
            reservoir.push(item);
        } else {
            const j = Math.floor(Math.random() * (i + 1));
            if (j < k) {
                reservoir[j] = item;
            }
        }
        i++;
    }

    return reservoir;
}

// Simulate a large stream
const stream = Array.from({ length: 10_000 }, (_, i) => i + 1);
const sample = reservoirSample(stream, 5);
console.log("Random sample of 5 from 10,000 items:", sample);
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(n) — one pass through the stream |
| **Space** | O(K) — only the reservoir is kept in memory |

No matter how large the stream grows, memory stays flat at `K` slots. That is the entire point.

---

## One Minute Insight

> **The trick is controlled forgetting.** Instead of remembering everything to sample fairly later, reservoir sampling forgets old items with *exactly* the right probability as new ones arrive — turning an impossible memory problem into a trivially small one.

This is the same intuition behind many streaming algorithms: you do not need the full history to reason about it correctly, you just need the right mathematical invariant.

*Check `code.py` and `code.js` to run this experiment yourself!*
