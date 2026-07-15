# The Hash That Slides Instead of Starts Over

Imagine reading a book, one word at a time, but every time you move to the next word you're forced to re-read the entire page from the beginning just to "remember" where you are. That's how naive string matching works — and there's a trick that lets you slide forward for the price of a glance.

---

## The Problem

You need to find every place a short **pattern** appears inside a long **text**. The obvious approach: at every position, compare character by character. That's `O(n * m)` in the worst case — for a 1GB log file and a 20-character search term, that's a lot of wasted rereading.

Can you check "does this window match?" in **O(1)** time per position, after paying for the first window once?

**Your goal:** Find every starting index of `pattern` in `text`, without re-scanning the whole window at every shift.

---

## Example

```
text    = "abracadabra"
pattern = "abra"

Match at index 0: "abra"cadabra
Match at index 7: abracad"abra"

Output: [0, 7]
```

```
text    = "aaaaaa"
pattern = "aa"

Output: [0, 1, 2, 3, 4]   ← overlapping matches count
```

---

## Why It Matters

A **rolling hash** treats a string window like a number in some base (base-256, base-31, whatever) and updates that number incrementally as the window slides — drop the leading digit's contribution, shift, add the new trailing digit. No re-summing from scratch.

This one trick quietly powers:

| Domain | Real-World Use |
| :--- | :--- |
| **Competitive programming** | Rabin-Karp substring search, longest duplicate substring |
| **Cybersecurity** | Detecting known malware signatures streaming through a byte buffer |
| **Distributed systems** | `rsync`/`rdiff` — hashing rolling windows to find unchanged chunks between file versions |
| **Databases & storage** | Content-defined chunking for deduplication (e.g., backup systems, Git's packfile deltas) |
| **Plagiarism detection** | Fingerprinting overlapping n-grams of text to spot copied passages |

The deeper lesson: **when your window shifts by one, don't recompute — update.**

---

## Solution

### The Key Insight: A String Is Just a Number in Disguise

Treat each character as a digit in base `B` (say, 256, since bytes range 0–255). The hash of a window of length `m` is:

```
hash = c[0]*B^(m-1) + c[1]*B^(m-2) + ... + c[m-1]*B^0   (mod some large prime)
```

To slide the window from position `i` to `i+1`:

1. **Remove** the leading character's contribution: subtract `c[i] * B^(m-1)`.
2. **Shift** everything up one place: multiply by `B`.
3. **Add** the new trailing character: add `c[i+m]`.

That's three cheap arithmetic operations — no matter how long the window is.

### Beginner-Friendly Walkthrough

```
text = "abracadabra", pattern = "abra" (m = 4)

Step 1: Hash "abra" (positions 0-3) → some number H1
        Hash "abra" (the pattern)   → same number H1  → hash match!
        Confirm with direct string compare → real match at index 0 ✓

Step 2: Slide window to "brac" (positions 1-4)
        remove 'a', shift, add 'c' → new hash in O(1)
        H(brac) ≠ H(abra) → skip, no wasted char-by-char scan

... slide, slide, slide ...

Step 8: Window "abra" (positions 7-10) → hash matches H1 again
        Confirm with direct compare → real match at index 7 ✓
```

Because hashes can theoretically collide (two different strings, same hash), always double-check a hash match with a direct substring comparison — cheap insurance that keeps the algorithm correct, not just fast.

---

## Code

### Python

```python
def rabin_karp(text, pattern):
    """Find every index where `pattern` occurs in `text` using a rolling hash."""
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []

    BASE = 256
    MOD = 1_000_000_007
    high_order = pow(BASE, m - 1, MOD)  # weight of the leading character

    pattern_hash = 0
    window_hash = 0
    for i in range(m):
        pattern_hash = (pattern_hash * BASE + ord(pattern[i])) % MOD
        window_hash = (window_hash * BASE + ord(text[i])) % MOD

    matches = []
    for i in range(n - m + 1):
        # Hashes match? Confirm with a direct comparison (guards against collisions).
        if window_hash == pattern_hash and text[i:i + m] == pattern:
            matches.append(i)

        if i < n - m:
            # Slide the window one step: drop the leading char, add the trailing one.
            window_hash = (window_hash - ord(text[i]) * high_order) % MOD
            window_hash = (window_hash * BASE + ord(text[i + m])) % MOD
            window_hash %= MOD

    return matches


print(rabin_karp("abracadabra", "abra"))  # [0, 7]
```

### JavaScript

```javascript
function rabinKarp(text, pattern) {
    // Find every index where `pattern` occurs in `text` using a rolling hash.
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return [];

    const BASE = 256n;
    const MOD = 1_000_000_007n;

    let highOrder = 1n; // weight of the leading character (BASE^(m-1) mod MOD)
    for (let i = 0; i < m - 1; i++) highOrder = (highOrder * BASE) % MOD;

    let patternHash = 0n;
    let windowHash = 0n;
    for (let i = 0; i < m; i++) {
        patternHash = (patternHash * BASE + BigInt(pattern.charCodeAt(i))) % MOD;
        windowHash = (windowHash * BASE + BigInt(text.charCodeAt(i))) % MOD;
    }

    const matches = [];
    for (let i = 0; i <= n - m; i++) {
        if (windowHash === patternHash && text.slice(i, i + m) === pattern) {
            matches.push(i);
        }

        if (i < n - m) {
            windowHash = (windowHash - BigInt(text.charCodeAt(i)) * highOrder) % MOD;
            windowHash = (windowHash * BASE + BigInt(text.charCodeAt(i + m))) % MOD;
            windowHash = ((windowHash % MOD) + MOD) % MOD;
        }
    }

    return matches;
}

console.log(rabinKarp("abracadabra", "abra")); // [0, 7]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n + m) average | Each slide is O(1); only a genuine hash match triggers an O(m) verification |
| **Space** | O(1) | Just a couple of running hash values, no matter how big the text is |

Worst case degrades to `O(n * m)` if an adversarial input causes constant hash collisions — but with a good base and a large prime modulus, that's astronomically unlikely in practice.

---

## One Minute Insight

> **Don't recompute what you can update.** Any time a computation depends on a sliding or moving window — a hash, a sum, a max — ask whether removing the old edge and adding the new one is cheaper than starting over.

Rabin-Karp isn't really about strings. It's about recognizing that a window's state at position `i+1` is almost entirely inherited from position `i`, plus one small delta. That single idea — incremental update over full recomputation — is the same instinct behind sliding-window sums, incremental checksums, and streaming aggregates in real-time systems.

*Run `code.py` or `code.js` to see it in action.*
