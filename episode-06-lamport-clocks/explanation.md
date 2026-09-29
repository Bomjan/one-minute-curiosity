# Whose Clock Is Right?

Two servers disagree about what time it is, so which event happened first? Leslie Lamport's answer: stop asking about time, and start counting causes.

---

## The Problem

Imagine three friends in different cities texting each other. Their watches are all a little off, so timestamps like "3:02 PM" can't prove whose message came first. Yet you still need a reliable ordering: a reply must never appear *before* the question it answers.

In distributed systems, physical clocks drift, sync over the network has jitter, and "just use `time.now()`" quietly corrupts data.

**Your goal:** give every event a number so that if event `X` could have *caused* event `Y`, then `number(X) < number(Y)`, with no wall clock involved.

---

## Example

```
A: local event            → A.clock = 1
B: 4 local events         → B.clock = 4
B: sends message          → B.clock = 5   (message carries 5)
A: receives message       → A.clock = max(1, 5) + 1 = 6
A: sends reply            → A.clock = 7   (message carries 7)
C: receives reply         → C.clock = max(0, 7) + 1 = 8
```

Without the `max`, A would stamp the receive as `2`, which is *earlier* than the send that caused it (`5`).

---

## Why It Matters

Logical clocks are the foundation for ordering in systems where trusting wall time is dangerous:

| Domain | Where it shows up |
| :--- | :--- |
| **Databases** | Versioning and conflict resolution in replicated stores |
| **Distributed systems** | Ancestor of vector clocks and hybrid logical clocks (used in CockroachDB and others) |
| **Debugging** | Ordering logs from many services into one coherent story |
| **Collaboration apps** | Ordering edits in CRDT-style editors |

---

## Solution

### The Key Insight: Count Causality, Not Seconds

Each process keeps one integer. Three rules:

1. **Local event** → increment your counter.
2. **Send** → increment, then attach your counter to the message.
3. **Receive** → set your counter to `max(yours, message's) + 1`.

Rule 3 is the magic. Receiving a message drags your clock past everything the sender had already seen, so effects always get bigger numbers than their causes.

### Walkthrough

B is busy (clock = 4) and sends at `5`. A is idle (clock = 1). A doesn't trust its own count. It leaps to `6`. Now A's reply, stamped `7`, is guaranteed to sort after B's original message, no matter how wrong anyone's watch is.

### The Catch

The guarantee runs one way: `X → Y` implies `L(X) < L(Y)`, but **not** the reverse. Two events with `3 < 5` may be unrelated (concurrent). Detecting concurrency needs *vector clocks*.

---

## Code

### Python

```python
class Process:
    def __init__(self, name):
        self.name = name
        self.clock = 0

    def local_event(self):
        self.clock += 1
        return self.clock

    def send(self):
        # Sending is an event; the timestamp travels with the message
        self.clock += 1
        return self.clock

    def receive(self, timestamp):
        # Jump past anything the sender had already seen
        self.clock = max(self.clock, timestamp) + 1
        return self.clock


if __name__ == "__main__":
    a, b, c = Process("A"), Process("B"), Process("C")

    a.local_event()               # A: 1
    for _ in range(4):
        b.local_event()           # B: 4

    msg = b.send()                # B: 5
    print("A receives:", a.receive(msg))   # 6, not 2

    reply = a.send()              # A: 7
    print("C receives:", c.receive(reply))  # 8, not 1
```

### JavaScript

```javascript
class Process {
    constructor(name) {
        this.name = name;
        this.clock = 0;
    }

    localEvent() {
        return ++this.clock;
    }

    send() {
        return ++this.clock;
    }

    receive(timestamp) {
        this.clock = Math.max(this.clock, timestamp) + 1;
        return this.clock;
    }
}

const a = new Process("A");
const b = new Process("B");
const c = new Process("C");

a.localEvent();
for (let i = 0; i < 4; i++) b.localEvent();

const msg = b.send();
console.log("A receives:", a.receive(msg));   // 6

const reply = a.send();
console.log("C receives:", c.receive(reply)); // 8
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per event | One increment or one `max` |
| **Space** | O(1) per process | A single integer, plus one integer per message |

---

## One Minute Insight

> **In distributed systems, "before" means "could have influenced", not "the clock said so."** A single integer that only moves forward, and leaps ahead on every message, is enough to respect causality.

*Run `code.py` or `code.js` to see it in action.*
