# The Data Structure That Never Lies About "No"

A Bloom filter says one of two things:
- **"Definitely NOT in the set"** — 100% accurate, every time
- **"Probably in the set"** — might occasionally be wrong

That asymmetry is not a bug. It's the entire design — and it powers Google Chrome, Redis, Cassandra, and Akamai at massive scale.

---

## The Problem

A new user tries to register with `alice@example.com`. Before touching the database, you want to check whether this email is already taken. You have **500 million** registered users.

Storing all 500M emails in a hash set? That's ~20GB of RAM just for the lookup table.

Is there a way to check membership in **O(1) time** using **kilobytes** instead of gigabytes — and never miss an existing user?

---

## Example

```
Bloom filter contains: ["alice@example.com", "bob@example.com"]

check("alice@example.com") → "Probably YES"  ✓ (correct)
check("carol@example.com") → "Definitely NO" ✓ (correct, 100% guaranteed)
check("dave@example.com")  → "Probably YES"  ✗ (false positive — rare, controlled)
```

---

## Why It Matters

| Use Case | System |
| :--- | :--- |
| Avoid DB hit for missing keys | Redis, Apache Cassandra |
| Malicious URL detection | Google Chrome Safe Browsing |
| Duplicate transaction filtering | Fintech / payment systems |
| Spell checking | Early Unix `spell` command |
| CDN pre-filtering | Akamai, Cloudflare |
| Bioinformatics | DNA sequence lookup (k-mer matching) |

When a false positive means "one extra database lookup" and a false negative means "serving a banned user," the trade is obvious: **you can afford occasional false positives, but never false negatives.**

---

## Solution

A Bloom filter has two components:
- A **bit array** of size `m` (initially all zeros)
- `k` independent **hash functions**

### Insert(x)
Run `x` through all `k` hash functions. For each result `h_i(x)`, set `bit_array[h_i(x) % m] = 1`.

### Query(x)
Run `x` through all `k` hash functions. If **any** bit is `0` → the element is **definitely not** in the set. If **all** bits are `1` → the element is **probably** in the set.

### Why No False Negatives?
When you insert `x`, you flip exactly those `k` bits to `1`. Bits never flip back to `0`. So if `x` was inserted, all its bits are permanently set — the query will always return "probably yes."

### Why False Positives Happen
Two different elements can hash to overlapping bit positions. An element you never inserted might have all its bit positions set by other elements. The probability of this is controlled by choosing `m` and `k` carefully.

**Optimal false positive rate formula:**
```
p ≈ (1 - e^(-kn/m))^k

where:
  n = number of inserted elements
  m = bit array size
  k = number of hash functions
```

### Walkthrough

```
m = 10 bits, k = 2 hash functions
Initial:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
             0  1  2  3  4  5  6  7  8  9

Insert "alice":  h1=2, h2=7  →  [0,0,1,0,0,0,0,1,0,0]
Insert "bob":    h1=4, h2=7  →  [0,0,1,0,1,0,0,1,0,0]

Query "alice":   h1=2 ✓, h2=7 ✓  →  "Probably YES" (correct)
Query "carol":   h1=1 ✗          →  "Definitely NO" (correct)
Query "dave":    h1=2 ✓, h2=4 ✓  →  "Probably YES" (FALSE POSITIVE)
                 ^ dave was never inserted, but bits 2 and 4 were set by alice and bob
```

---

## Code

See `code.py` and `code.js` for clean implementations.

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time (insert)** | O(k) — k hash computations, k is a small constant |
| **Time (query)** | O(k) — same |
| **Space** | O(m) — just the bit array, independent of n |

For 1M elements at 1% false positive rate, a Bloom filter needs only **~1.2MB**. A hash set of those same elements would need ~50MB or more.

---

## One Minute Insight

> **You can trade certainty for memory — as long as you choose which direction to be certain about.**

A Bloom filter is the canonical example of a *probabilistic data structure*: it accepts controlled inaccuracy in one direction to achieve dramatic efficiency gains. The design question isn't "is this wrong?" — it's "can my system tolerate this specific type of wrongness?" When the answer is yes, a few kilobytes can replace gigabytes of RAM.

This is the same intuition behind Count-Min Sketch, HyperLogLog, and many other structures at the heart of modern distributed systems.

*Run `code.py` or `code.js` to see it in action.*
