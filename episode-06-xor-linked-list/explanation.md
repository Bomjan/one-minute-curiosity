# The Linked List That Halves Its Own Memory

A doubly linked list needs two pointers per node — `prev` and `next`. What if you could get the same two-way traversal using **just one**?

---

## The Problem

Every doubly linked list node looks like this:

```
[ prev_pointer | value | next_pointer ]
```

Two pointer fields, every single node, forever. On a list with millions of nodes on a memory-constrained device (think embedded systems or old-school OS kernels), that's millions of wasted machine words.

Here's the trick: instead of storing `prev` and `next` separately, store **one field**:

```
link = prev_address XOR next_address
```

Because XOR is its own inverse (`a ^ b ^ b = a`), if you're walking the list and you already know the address you *came from*, you can recover the address to go *next* — from that single field. Same trick works walking backward.

**Can you build a list that's fully traversable in both directions, using half the pointer storage?**

---

## Example

```
Insert: A → B → C → D

Node A: link = NULL ^ addr(B)        = addr(B)
Node B: link = addr(A) ^ addr(C)
Node C: link = addr(B) ^ addr(D)
Node D: link = addr(C) ^ NULL        = addr(C)

Forward traversal from head, knowing prev=NULL:
  A: next = link(A) ^ NULL = addr(B)   → visit B
  B: next = link(B) ^ addr(A) = addr(C) → visit C
  C: next = link(C) ^ addr(B) = addr(D) → visit D
  D: next = link(D) ^ addr(C) = NULL    → done

Result: A, B, C, D  (and B, C, A run backward the same way)
```

One field per node. Both directions. No ambiguity.

---

## Why It Matters

This isn't just a party trick — it's a real technique used where memory is the scarcest resource:

| Domain | Where it shows up |
| :--- | :--- |
| **Embedded systems** | Firmware and microcontrollers with kilobytes of RAM |
| **Operating systems** | Kernel data structures that must minimize per-object overhead |
| **Cache-friendly design** | Smaller nodes mean more of the list fits in a CPU cache line |
| **Memory forensics / security** | Recognizing XOR-obfuscated pointer chains when reverse-engineering malware or kernel exploits |
| **Algorithm design generally** | A reminder that "two pieces of information" can often be compressed into one *reversible* operation |

The deeper lesson: **if an operation is its own inverse, you can use it to smuggle two values through the space of one.** XOR, modular arithmetic, and even multiplication (via inverses) all share this property — and clever data structures exploit it constantly.

---

## Solution

### The Key Insight: XOR Never Loses Information

`prev ^ next` looks like it destroys data — you can't read `prev` or `next` back out of it directly. But you don't need to, *if you always know one side already*.

Traversal always starts from a known point (the head, with `prev = NULL`, or the tail, with `next = NULL`). At every step:

```
next_or_prev = link XOR (the address you just came from)
```

You then move forward carrying the *new* current address as your "came from" value for the next step. It's a rolling XOR — one known value unlocks the next, forever.

### Step-by-Step Walkthrough

1. Start at `head`, with `prev = NULL`.
2. Read `head`'s link field. XOR it with `prev` (`NULL`) → get the real `next` address.
3. Move: the old `curr` becomes the new `prev`; the recovered address becomes the new `curr`.
4. Repeat until `curr == NULL`.

Insertion at the tail only touches two nodes: the new node (whose link is simply the old tail's address, since its `next` is `NULL`), and the old tail (whose link gets XOR'd with the new node's address to swap its `next` from `NULL` to the new node).

---

## Code

### Python

```python
class XORLinkedList:
    NULL = 0  # sentinel address, like a null pointer

    def __init__(self):
        self.nodes = {}          # address -> [value, link]
        self.head = self.NULL
        self.tail = self.NULL
        self._next_addr = 1      # fake "memory allocator"

    def _alloc(self):
        addr = self._next_addr
        self._next_addr += 1
        return addr

    def append(self, value):
        addr = self._alloc()

        if self.head == self.NULL:
            self.nodes[addr] = [value, self.NULL]
            self.head = self.tail = addr
            return addr

        # New node's link = XOR(prev=tail, next=NULL) == tail
        self.nodes[addr] = [value, self.tail]

        # Old tail's link = XOR(prev, NULL) becomes XOR(prev, addr)
        tail_value, tail_link = self.nodes[self.tail]
        self.nodes[self.tail][1] = tail_link ^ addr

        self.tail = addr
        return addr

    def traverse_forward(self):
        values = []
        prev, curr = self.NULL, self.head
        while curr != self.NULL:
            value, link = self.nodes[curr]
            values.append(value)
            prev, curr = curr, link ^ prev  # recover "next" from the single field
        return values

    def traverse_backward(self):
        values = []
        nxt, curr = self.NULL, self.tail
        while curr != self.NULL:
            value, link = self.nodes[curr]
            values.append(value)
            nxt, curr = curr, link ^ nxt  # recover "prev" the same way
        return values


if __name__ == "__main__":
    xll = XORLinkedList()
    for v in ["A", "B", "C", "D"]:
        xll.append(v)

    print("Forward: ", xll.traverse_forward())   # ['A', 'B', 'C', 'D']
    print("Backward:", xll.traverse_backward())  # ['D', 'C', 'B', 'A']
```

### JavaScript

```javascript
class XORLinkedList {
  static NULL = 0;

  constructor() {
    this.nodes = new Map(); // address -> [value, link]
    this.head = XORLinkedList.NULL;
    this.tail = XORLinkedList.NULL;
    this.nextAddr = 1; // fake "memory allocator"
  }

  #alloc() {
    return this.nextAddr++;
  }

  append(value) {
    const addr = this.#alloc();

    if (this.head === XORLinkedList.NULL) {
      this.nodes.set(addr, [value, XORLinkedList.NULL]);
      this.head = this.tail = addr;
      return addr;
    }

    // New node's link = XOR(prev=tail, next=NULL) == tail
    this.nodes.set(addr, [value, this.tail]);

    // Old tail's link = XOR(prev, NULL) becomes XOR(prev, addr)
    const [tailValue, tailLink] = this.nodes.get(this.tail);
    this.nodes.get(this.tail)[1] = tailLink ^ addr;

    this.tail = addr;
    return addr;
  }

  traverseForward() {
    const values = [];
    let prev = XORLinkedList.NULL;
    let curr = this.head;
    while (curr !== XORLinkedList.NULL) {
      const [value, link] = this.nodes.get(curr);
      values.push(value);
      [prev, curr] = [curr, link ^ prev]; // recover "next" from the single field
    }
    return values;
  }

  traverseBackward() {
    const values = [];
    let next = XORLinkedList.NULL;
    let curr = this.tail;
    while (curr !== XORLinkedList.NULL) {
      const [value, link] = this.nodes.get(curr);
      values.push(value);
      [next, curr] = [curr, link ^ next]; // recover "prev" the same way
    }
    return values;
  }
}

const xll = new XORLinkedList();
["A", "B", "C", "D"].forEach((v) => xll.append(v));

console.log("Forward: ", xll.traverseForward());  // ['A', 'B', 'C', 'D']
console.log("Backward:", xll.traverseBackward()); // ['D', 'C', 'B', 'A']
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) append, O(n) full traversal | Same as a normal doubly linked list — the XOR trick changes storage, not traversal cost |
| **Space** | ~50% less pointer overhead | One `link` field per node instead of two (`prev` + `next`) |

The catch in real systems languages: you *do* need actual addressable pointers to XOR (Python/JS objects don't expose raw addresses, which is why this demo uses integer "handles" instead). In C, this is a genuine, shippable optimization.

---

## One Minute Insight

> **A reversible operation can carry two secrets in the space of one.** XOR doesn't destroy `prev` or `next` — it just requires you to already hold one of them to unlock the other. That's the same principle behind checksums, one-time pads, and even how `a, b = b, a - b` swaps used to be done without a temp variable.

Half the memory, zero loss of information — as long as you never forget where you came from.

*Run `code.py` or `code.js` to see it in action.*
