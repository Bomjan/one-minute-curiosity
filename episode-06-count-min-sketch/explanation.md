# The Grid That Counts Without Remembering

Imagine a bouncer who has to know "how many times has this exact person shown up tonight?" for millions of strangers, but is only allowed to carry a tiny notepad. No names, no list — just a handful of tally marks. Turns out, a few rows of counters and a bit of pessimism is all it takes.

---

## The Problem

You're running a system that sees an enormous, unbounded stream of events — search terms, IP addresses, product views, API keys — and you need to answer: **"how many times has `X` occurred?"** for any `X`, at any time.

Storing an exact counter per unique item is easy in theory (a hash map) but breaks down at scale: millions of unique keys means millions of counters, and memory becomes the bottleneck long before CPU does.

**Your goal:** answer frequency queries using a small, *fixed* amount of memory — regardless of how many unique items pass through — while accepting a controlled amount of error.

The catch: the memory budget can't grow with the number of unique items. Whether you see 100 distinct things or 100 million, the structure stays the same size.

---

## Example

Take a tiny sketch: a **3×4 grid** of counters (3 hash functions, 4 columns each). We feed it `"trending_topic"` **100 times** and `"rare_typo"` **3 times**:

```
Row 0: trending_topic → col 1   rare_typo → col 1   (COLLISION)
Row 1: trending_topic → col 2   rare_typo → col 0   (no collision)
Row 2: trending_topic → col 3   rare_typo → col 3   (COLLISION)
```

After all the increments, the grid looks like this:

```
        col0  col1  col2  col3
Row 0:   0    103    0     0     ← rare_typo's count leaked into trending_topic's cell
Row 1:   0     0    100    0     ← the only clean row for both items
Row 2:   0     0     0    103    ← another collision
```

Querying `rare_typo`: its counters across the three rows are `[103, 3, 103]`. Take the **minimum** → `3`. Exactly right, even though 2 of its 3 rows were contaminated by a much bigger counter.

Querying `trending_topic`: its counters are `[103, 100, 103]`. Minimum → `100`. Also exact.

---

## Why It Matters

This pattern — the **Count-Min Sketch** — quietly powers frequency estimation across the industry:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Query planners estimate how selective a `WHERE` clause is without scanning the table |
| **Networking** | Detecting DDoS traffic by spotting IPs with abnormally high packet counts |
| **AI / ML** | Feature hashing — counting rare vs. common tokens in massive text corpora |
| **Distributed systems** | Redis's `PFCOUNT`-style approximate structures and stream-processing frameworks (Flink, Spark) use sketches for "heavy hitters" |
| **Ad tech** | Tracking click frequency per user/ad pair across billions of impressions |

It sits alongside **Bloom filters** (episode 04) in the family of *probabilistic sketches* — but where a Bloom filter only answers "have I seen this?", a Count-Min Sketch answers "**how many times** have I seen this?" using the same core trick: multiple hash functions and a willingness to be occasionally, predictably wrong.

---

## Solution

### The Key Insight: Collisions Only Ever Inflate, Never Deflate

Every `add(item)` hashes the item into **one column per row** and increments that cell. Because multiple items can hash to the same column, a cell's value is always **greater than or equal to** the true count of any single item mapped there — it can pick up extra "noise" from other items sharing its bucket, but it can never lose counts.

That one-directional error is the whole trick: if you read an item's counter across **all rows** and take the **minimum**, you're selecting the row that happened to have the least collision noise for that specific item. The minimum can never be *below* the truth (every row is an overestimate or exact), and it's usually *at* the truth as long as at least one row was clean.

### Step-by-Step Walkthrough

1. **Allocate** a `depth × width` grid of counters, all zeroed out. `depth` = number of independent hash functions (rows), `width` = number of buckets per row (columns).
2. **To add an item**: compute `depth` independent hashes of it, one per row, and increment the corresponding cell in each row.
3. **To estimate an item's count**: compute the same `depth` hashes again, read each row's cell, and return the **minimum**.
4. **More rows or wider columns** = fewer collisions = tighter estimates, at the cost of more memory. You tune this tradeoff up front, and it never changes as the stream grows.

Notice what's *not* happening: nothing is ever stored that identifies which item incremented which cell. The structure has no idea `"trending_topic"` exists — it just has numbers in boxes.

---

## Code

### Python

```python
class CountMinSketch:
    """A fixed-size grid of counters that estimates how often an item
    was seen, without ever storing the items themselves."""

    def __init__(self, width=200, depth=5):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _hash(self, item, seed):
        # A different seed per row spreads collisions across independent hashes
        h = seed
        for ch in str(item):
            h = (h * 31 + ord(ch)) & 0xFFFFFFFF
        return h % self.width

    def add(self, item, count=1):
        for row in range(self.depth):
            col = self._hash(item, row)
            self.table[row][col] += count

    def estimate(self, item):
        # A collision can only ever inflate a row's counter, never deflate it,
        # so the smallest row is always the closest we can get to the truth.
        return min(self.table[row][self._hash(item, row)] for row in range(self.depth))


if __name__ == "__main__":
    sketch = CountMinSketch(width=50, depth=4)

    events = ["login"] * 120 + ["click"] * 45 + ["purchase"] * 8 + ["logout"] * 60
    for event in events:
        sketch.add(event)

    for event in ["login", "click", "purchase", "logout", "refund"]:
        print(f"{event}: ~{sketch.estimate(event)}")
    # login: ~120, click: ~45, purchase: ~8, logout: ~60, refund: ~0
```

### JavaScript

```javascript
class CountMinSketch {
    // A fixed-size grid of counters that estimates how often an item
    // was seen, without ever storing the items themselves.
    constructor(width = 200, depth = 5) {
        this.width = width;
        this.depth = depth;
        this.table = Array.from({ length: depth }, () => new Array(width).fill(0));
    }

    _hash(item, seed) {
        // A different seed per row spreads collisions across independent hashes
        let h = seed;
        const str = String(item);
        for (let i = 0; i < str.length; i++) {
            h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
        }
        return h % this.width;
    }

    add(item, count = 1) {
        for (let row = 0; row < this.depth; row++) {
            const col = this._hash(item, row);
            this.table[row][col] += count;
        }
    }

    estimate(item) {
        // A collision can only ever inflate a row's counter, never deflate it,
        // so the smallest row is always the closest we can get to the truth.
        let best = Infinity;
        for (let row = 0; row < this.depth; row++) {
            best = Math.min(best, this.table[row][this._hash(item, row)]);
        }
        return best;
    }
}

const sketch = new CountMinSketch(50, 4);

const events = [
    ...Array(120).fill("login"),
    ...Array(45).fill("click"),
    ...Array(8).fill("purchase"),
    ...Array(60).fill("logout"),
];
events.forEach((event) => sketch.add(event));

["login", "click", "purchase", "logout", "refund"].forEach((event) => {
    console.log(`${event}: ~${sketch.estimate(event)}`);
});
// login: ~120, click: ~45, purchase: ~8, logout: ~60, refund: ~0
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(depth) per `add` or `estimate` | Each operation touches exactly one cell per row — independent of how many unique items exist |
| **Space** | O(depth × width) — **fixed** | The grid size is chosen up front and never grows, no matter the stream size |

Compare this to a hash map counter, which is O(1) per operation but O(unique items) in space — the sketch trades a small, tunable amount of accuracy for a memory bound that never moves.

---

## One Minute Insight

> **When you can't afford to remember everything, remember less — but remember it pessimistically.** A Count-Min Sketch never underestimates, only overestimates, and that one-directional guarantee is precisely what makes "take the minimum across rows" a correct recovery strategy instead of a guess.

The elegance is in the asymmetry: errors only ever push a count *up*, so squeezing the smallest surviving signal out of several noisy readings gets you back to the truth more often than not. It's the same philosophy as majority voting or Bloom filters — sacrifice certainty for space, but choose *which way* you're wrong on purpose.

*Run `code.py` or `code.js` to see it in action.*
