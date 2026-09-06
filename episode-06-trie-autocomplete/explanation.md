# The Tree That Finishes Your Sentences

Every time your phone predicts your next word, or your terminal completes a half-typed command, a tree is quietly walking your keystrokes one letter at a time. It never scans a word list. It just follows a path.

---

## The Problem

You're building autocomplete for a search bar. Given a dictionary of `n` words, you need to answer, instantly, as the user types:

1. **Does this exact word exist?**
2. **Does anything start with this prefix?**
3. **What are all the words that start with this prefix?**

The naive approach: store every word in an array and scan it on each keystroke → **O(n · L)** per query, where `L` is word length. Type "c", "cu", "cur", "curi" — that's four full scans over the whole dictionary, and the dictionary might hold millions of words.

**Your goal:** answer all three questions in time proportional to the *length of what was typed*, not the *size of the dictionary*.

---

## Example

```
Dictionary: ["cat", "car", "cart", "curiosity", "curious", "cup"]

Query: search("car")        → true   (exact word exists)
Query: startsWith("cu")     → true   (something begins with "cu")
Query: startsWith("cart")   → true
Query: startsWith("care")   → false  (nothing begins with "care")

Query: autocomplete("cur")  → ["curious", "curiosity"]
Query: autocomplete("ca")   → ["car", "cart", "cat"]
```

Notice `autocomplete("cur")` never touched `"cat"`, `"car"`, `"cart"`, or `"cup"` — it only explored the branch of the tree that matched the prefix.

---

## Why It Matters

The **Trie** (from re**trie**val, pronounced "try") is the quiet workhorse behind:

| Domain | Real-World Use |
| :--- | :--- |
| **Web engineering** | Search-bar autocomplete, IDE code completion |
| **Networking** | IP routing tables use tries for longest-prefix matching |
| **AI / NLP** | Tokenizers and predictive-text keyboards |
| **Databases** | Prefix-compressed indexes (e.g. in LSM-trees, Redis) |
| **Competitive programming** | Word search, spell-checkers, T9 predictive text |

The deeper lesson: **when many items share a prefix, store the prefix once.** A trie turns a pile of overlapping strings into a single shared path structure — the same idea that makes file systems, DNS, and URL routers fast.

---

## Solution

### The Key Insight: One Node Per Character, Shared When Possible

A trie is a tree where:
- Each **edge** represents one character.
- Each **node** represents the prefix formed by the path from the root.
- A node is flagged `is_end` if a complete word ends there.

Inserting `"car"` and `"cart"` means walking `c → a → r`, then continuing `t` from the same `r` node — the shared prefix `"car"` is stored **exactly once**, no matter how many words extend it.

### Step-by-Step Walkthrough

```
Insert "cat", "car", "cart":

root
 └─ c
     └─ a
         ├─ t (end)      ← "cat"
         └─ r (end)      ← "car"
             └─ t (end)  ← "cart"

startsWith("ca") → walk root → c → a. Reached a node. True.
search("ca")     → walk root → c → a. Node exists, but is_end=False. False.
search("car")    → walk root → c → a → r. is_end=True. True.

autocomplete("ca") → walk to node "ca", then DFS collecting every
                      is_end node below it: ["car", "cart", "cat"]
```

Each operation only ever visits `L` nodes for a prefix of length `L` — the size of the dictionary never enters the walk.

---

## Code

### Python

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def _find_node(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def search(self, word):
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find_node(prefix) is not None

    def autocomplete(self, prefix):
        node = self._find_node(prefix)
        if node is None:
            return []

        results = []

        def collect(node, path):
            if node.is_end:
                results.append(prefix + path)
            for ch, child in node.children.items():
                collect(child, path + ch)

        collect(node, "")
        return sorted(results)


if __name__ == "__main__":
    trie = Trie()
    for word in ["cat", "car", "cart", "curiosity", "curious", "cup"]:
        trie.insert(word)

    print(trie.search("car"))          # True
    print(trie.starts_with("cu"))      # True
    print(trie.starts_with("care"))    # False
    print(trie.autocomplete("cur"))    # ['curiosity', 'curious']
    print(trie.autocomplete("ca"))     # ['car', 'cart', 'cat']
```

### JavaScript

```javascript
class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
    }

    #findNode(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            if (!node.children.has(ch)) return null;
            node = node.children.get(ch);
        }
        return node;
    }

    search(word) {
        const node = this.#findNode(word);
        return node !== null && node.isEnd;
    }

    startsWith(prefix) {
        return this.#findNode(prefix) !== null;
    }

    autocomplete(prefix) {
        const node = this.#findNode(prefix);
        if (node === null) return [];

        const results = [];
        const collect = (node, path) => {
            if (node.isEnd) results.push(prefix + path);
            for (const [ch, child] of node.children) collect(child, path + ch);
        };

        collect(node, "");
        return results.sort();
    }
}

const trie = new Trie();
for (const word of ["cat", "car", "cart", "curiosity", "curious", "cup"]) {
    trie.insert(word);
}

console.log(trie.search("car"));       // true
console.log(trie.startsWith("cu"));    // true
console.log(trie.startsWith("care"));  // false
console.log(trie.autocomplete("cur")); // ['curiosity', 'curious']
console.log(trie.autocomplete("ca"));  // ['car', 'cart', 'cat']
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(L) per insert/search/prefix check | L = length of the word or prefix, independent of dictionary size |
| **Time (autocomplete)** | O(L + k) | k = total characters across all matched words |
| **Space** | O(total characters across all words) | Shared prefixes are stored once, not duplicated per word |

Compare that to scanning an array: **O(n · L)** per query. For a million-word dictionary, that's the difference between a keystroke feeling instant and feeling laggy.

---

## One Minute Insight

> **Structure your data the way you'll query it.** A trie doesn't store strings — it stores the *paths between them*. Because lookup follows the same path insertion built, both operations move at the speed of the query itself, not the size of the haystack.

This is the same trick behind IP routing tables, file-system paths, and URL routers: when your queries are inherently prefix-shaped, build a structure that is prefix-shaped too, and the "search" disappears — it becomes a walk.

*Run `code.py` or `code.js` to see it in action.*
