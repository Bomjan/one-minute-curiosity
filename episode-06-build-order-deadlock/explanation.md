# The Deadlock Detective

Your build system knows what depends on what. Can it find a valid order — and prove when none exists — with one tiny counter per task?

---

## The Problem

Imagine getting dressed: socks before shoes, shirt before jacket. Now add a cruel rule: *shoes before socks*. You'd stand there forever. That's a **dependency cycle**, and it's exactly what freezes builds, package installs, database migrations and threads.

Given tasks and "A must finish before B" rules, return an order that respects every rule, or report that none exists.

---

## Example

```
tasks: lint, compile, test, package, deploy
rules: compile → test, lint → package, test → package, package → deploy

Output: ['lint', 'compile', 'test', 'package', 'deploy']
```

```
Add one more rule: package → test

Output: None   (test and package wait on each other forever)
```

---

## Why It Matters

This is **topological sorting**, hiding inside tools you use daily:

| Domain | Where it appears |
| :--- | :--- |
| **Build systems** | `make`, Bazel, Gradle task graphs |
| **Package managers** | npm, pip, apt install ordering |
| **Databases** | Foreign-key-aware migrations and table loads |
| **Operating systems** | Deadlock detection in wait-for graphs |
| **Data/AI pipelines** | Airflow DAGs, ML feature pipelines |

---

## Solution

### The Insight: Wait Counters

Give every task a counter: *how many prerequisites are still unfinished?*

1. Any task with counter `0` is free to run — put it in a queue.
2. Run one, then decrement the counter of everything it unlocks.
3. Whoever hits `0` joins the queue.
4. Repeat until the queue is empty.

If every task ran, you have a valid order. If some never reached `0`, they are stuck waiting on each other (or on someone who is) — **a cycle**. Cycle detection comes for free.

### Walkthrough

```
Counters: lint=0 compile=0 test=1 package=2 deploy=1
Queue: [lint, compile]

run lint     → package: 2→1
run compile  → test: 1→0   queue: [test]
run test     → package: 1→0   queue: [package]
run package  → deploy: 1→0   queue: [deploy]
run deploy   ✓  (5 of 5 ran → valid)
```

With the extra `package → test` rule, `test` starts at 2 and `package` at 2; neither ever drops to 0, so only 3 of 5 run… and the algorithm correctly says "no order".

This is **Kahn's algorithm**.

---

## Code

### Python

See [`code.py`](./code.py).

### JavaScript

See [`code.js`](./code.js).

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(V + E) | Each task is queued once, each rule decremented once |
| **Space** | O(V + E) | Adjacency lists plus one counter per task |

---

## One Minute Insight

> **Deadlock is just a graph that refuses to drain.** If you can't peel off the nodes with nothing blocking them, something is waiting on itself.

Run `code.py` or `code.js` to see it in action.
