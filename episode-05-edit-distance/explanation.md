# How Many Keystrokes Away Is Your Typo?

> *"Autocorrect, spell checkers, git diff, DNA analysis — they all ask the same quiet question: how far apart are these two strings?"*

---

## The Problem

You typed `"recieve"`. Your text editor silently corrects it to `"receive"`.

Behind that instant fix is a 50-year-old algorithm computing the **Edit Distance** — the minimum number of single-character operations needed to transform one string into another.

The three allowed operations are:
- **Insert** a character
- **Delete** a character
- **Replace** a character with another

The challenge: find the **minimum** number of these operations to turn string `A` into string `B`.

This is also known as **Levenshtein Distance**, named after Soviet mathematician Vladimir Levenshtein who defined it in 1965.

---

## Example

```
Transform "kitten" → "sitting"

  k i t t e n
  s i t t i n g

Step 1: Replace 'k' → 's'    → "sitten"
Step 2: Replace 'e' → 'i'    → "sittin"
Step 3: Insert  'g' at end   → "sitting"

Edit Distance = 3
```

```
Transform "sunday" → "saturday"

Edit Distance = 3
(insert 'a', insert 't', replace 'n' → 'r')
```

---

## Why It Matters

Edit distance is one of those rare algorithms that quietly powers dozens of systems:

| System | Use Case |
|---|---|
| **Autocorrect / spell check** | Find the closest valid word to a typo |
| **Git / diff tools** | Compute minimal edits between file versions |
| **DNA sequencing** | Measure mutation distance between gene sequences |
| **Search engines** | Fuzzy search: "javascrpit" still finds JavaScript results |
| **NLP / LLMs** | Evaluate translation quality (BLEU score variants) |
| **Database deduplication** | Detect near-duplicate records |
| **Compiler error messages** | "Did you mean `println`?" |

The beauty: the same algorithm works whether you're comparing words, lines of code, protein sequences, or commit messages.

---

## Solution

**Brute force** would try every possible sequence of edits — exponential time. Instead, we use **dynamic programming**.

**Core insight:** the edit distance of two strings can be built from the edit distance of their substrings. This is the classic DP optimal substructure.

**The recurrence:**

Build a 2D table `dp[i][j]` = minimum edits to convert `A[0..i]` to `B[0..j]`.

```
If A[i] == B[j]:
    dp[i][j] = dp[i-1][j-1]          # no operation needed

Else:
    dp[i][j] = 1 + min(
        dp[i-1][j],                   # delete from A
        dp[i][j-1],                   # insert into A
        dp[i-1][j-1]                  # replace in A
    )
```

**Walkthrough for "cat" → "cut":**

```
    ""  c  u  t
""   0  1  2  3
c    1  0  1  2
a    2  1  1  2
t    3  2  2  1   ← answer: 1 (replace 'a' → 'u')
```

Base cases:
- `dp[i][0] = i` (delete all i characters)
- `dp[0][j] = j` (insert all j characters)

Fill row by row. The answer is `dp[len(A)][len(B)]`.

**Space optimization**: you only ever need the current row and the previous row — reducible from O(m×n) to O(n) space.

---

## Code

### Python

```python
def edit_distance(a: str, b: str) -> int:
    m, n = len(a), len(b)

    # dp[j] = edit distance between a[:i] and b[:j]
    prev = list(range(n + 1))

    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(
                    prev[j],      # delete
                    curr[j - 1],  # insert
                    prev[j - 1],  # replace
                )
        prev = curr

    return prev[n]


if __name__ == "__main__":
    pairs = [
        ("kitten", "sitting"),   # 3
        ("sunday", "saturday"),  # 3
        ("recieve", "receive"),  # 2
        ("cat", "cut"),          # 1
        ("", "hello"),           # 5
        ("hello", "hello"),      # 0
    ]
    for a, b in pairs:
        print(f'edit_distance("{a}", "{b}") = {edit_distance(a, b)}')
```

---

### JavaScript

```javascript
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(
          prev[j],      // delete
          curr[j - 1],  // insert
          prev[j - 1],  // replace
        );
      }
    }
    prev = curr;
  }

  return prev[n];
}

const pairs = [
  ["kitten",  "sitting"],   // 3
  ["sunday",  "saturday"],  // 3
  ["recieve", "receive"],   // 2
  ["cat",     "cut"],       // 1
  ["",        "hello"],     // 5
  ["hello",   "hello"],     // 0
];

for (const [a, b] of pairs) {
  console.log(`editDistance("${a}", "${b}") = ${editDistance(a, b)}`);
}
```

---

## Complexity

| Variant | Time | Space |
|---|---|---|
| **Classic 2D DP** | O(m × n) | O(m × n) |
| **Space-optimized (above)** | O(m × n) | O(n) |
| **Brute force (recursive, no memo)** | O(3^(m+n)) | O(m + n) stack |

Where `m` = length of string A, `n` = length of string B.

For two 1,000-character strings: ~1,000,000 operations — instant in practice.
For two DNA strands of 30,000 base pairs each: ~900,000,000 operations — still tractable with careful implementation.

---

## One Minute Insight

> Edit Distance teaches a deeper truth: **the shortest path between two things is often found by working backwards from their differences, not by trying every path forward.** The DP table doesn't just give you a number — it encodes the entire transformation history. Every problem where you ask "how similar are two sequences?" is Levenshtein in disguise, whether the sequences are words, lines of code, genome strands, or user sessions.
