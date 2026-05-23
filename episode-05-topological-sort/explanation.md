# The Order npm Figured Out Before You Did

Every time you run `npm install` or `pip install`, something quietly solves a problem that would take humans hours to untangle. It figures out the exact order to install hundreds of packages — each with its own dependencies — without ever installing a package before its requirements exist.

This is **topological sort**, and the algorithm behind it is surprisingly elegant.

---

## The Problem

You're given a list of tasks (or packages, courses, build steps — anything with dependencies). Each task may depend on other tasks that must complete first. Find a valid order to execute all tasks.

**The catch:** if there's a **circular dependency** (A needs B, B needs C, C needs A), no valid order exists. Detect and report it.

```
Tasks: [A, B, C, D, E]
Dependencies:
  A → must come before C
  A → must come before D
  B → must come before D
  B → must come before E
  C → must come before E

Find: one valid execution order
```

---

## Example

```
Input:
  numTasks = 6
  deps = [(5,2), (5,0), (4,0), (4,1), (2,3), (3,1)]
  (a, b) means: task a must come before task b

Output: [5, 4, 2, 3, 1, 0]   # one valid order

Input (circular dependency):
  deps = [(0,1), (1,2), (2,0)]

Output: []   # impossible — cycle detected
```

---

## Why It Matters

Topological sort is one of the most quietly impactful algorithms in software engineering:

| Domain | Where It Appears |
| :--- | :--- |
| **Package managers** | npm, pip, cargo — install order with 1000s of packages |
| **Build systems** | Make, Bazel, Gradle — compile only what changed, in order |
| **CI/CD pipelines** | GitHub Actions, Jenkins — run jobs in dependency order |
| **Database migrations** | Run schema changes in the right sequence |
| **Webpack/bundlers** | Resolve module import graphs before bundling |
| **Kubernetes** | Schedule pods after their dependencies start |

Any time you model "X must happen before Y," you're building a directed graph — and topological sort is how you linearize it.

---

## Solution

### The Insight: Peel the "Ready" Layer

**Kahn's Algorithm** works like a project manager who keeps a queue of "unblocked" tasks:

1. Count how many unsatisfied dependencies each task has (**in-degree**)
2. Push all tasks with **in-degree 0** into a queue (nothing blocks them)
3. Process the queue: take a task, add it to the result, then "remove" it by decrementing the in-degree of tasks it unlocks
4. Whenever a task's in-degree hits 0, it joins the queue
5. If the result contains all tasks → success. If not → **a cycle exists**

The key insight: a cycle means certain nodes never reach in-degree 0 — they stay locked waiting on each other forever.

---

### Step-by-Step Walkthrough

```
Tasks: 0,1,2,3,4,5
Edges: 5→2, 5→0, 4→0, 4→1, 2→3, 3→1

Step 1 — Compute in-degrees:
  Node:     0  1  2  3  4  5
  In-deg:   2  2  1  1  0  0

Step 2 — Queue = [4, 5]   (in-degree 0)
  Result: []

Step 3 — Process 4:
  → unlock 0 (in-deg: 2→1), unlock 1 (in-deg: 2→1)
  Result: [4], Queue: [5]

Step 4 — Process 5:
  → unlock 2 (in-deg: 1→0), unlock 0 (in-deg: 1→0)
  Result: [4, 5], Queue: [2, 0]

Step 5 — Process 2:
  → unlock 3 (in-deg: 1→0)
  Result: [4, 5, 2], Queue: [0, 3]

Step 6 — Process 0: no outgoing edges
  Result: [4, 5, 2, 0], Queue: [3]

Step 7 — Process 3:
  → unlock 1 (in-deg: 1→0)
  Result: [4, 5, 2, 0, 3], Queue: [1]

Step 8 — Process 1: no outgoing edges
  Result: [4, 5, 2, 0, 3, 1] ✓
```

All 6 tasks processed → no cycle. Valid order found.

---

## Code

### Python

```python
from collections import deque

def topological_sort(num_tasks, deps):
    graph = [[] for _ in range(num_tasks)]
    in_degree = [0] * num_tasks

    for src, dst in deps:
        graph[src].append(dst)
        in_degree[dst] += 1

    queue = deque(node for node in range(num_tasks) if in_degree[node] == 0)
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == num_tasks else []  # empty = cycle detected


if __name__ == "__main__":
    deps = [(5, 2), (5, 0), (4, 0), (4, 1), (2, 3), (3, 1)]
    print(topological_sort(6, deps))  # [5, 4, 2, 0, 3, 1] (or similar valid order)

    cycle_deps = [(0, 1), (1, 2), (2, 0)]
    print(topological_sort(3, cycle_deps))  # [] — cycle detected
```

### JavaScript

```javascript
function topologicalSort(numTasks, deps) {
    const graph = Array.from({ length: numTasks }, () => []);
    const inDegree = new Array(numTasks).fill(0);

    for (const [src, dst] of deps) {
        graph[src].push(dst);
        inDegree[dst]++;
    }

    const queue = [];
    for (let i = 0; i < numTasks; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }

    const order = [];
    while (queue.length > 0) {
        const node = queue.shift();
        order.push(node);
        for (const neighbor of graph[node]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) queue.push(neighbor);
        }
    }

    return order.length === numTasks ? order : [];  // empty = cycle detected
}

console.log(topologicalSort(6, [[5,2],[5,0],[4,0],[4,1],[2,3],[3,1]]));
// [5, 4, 2, 0, 3, 1]

console.log(topologicalSort(3, [[0,1],[1,2],[2,0]]));
// [] — cycle detected
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(V + E) | Each node and edge is visited exactly once |
| **Space** | O(V + E) | Adjacency list + in-degree array + queue |

Where V = number of tasks, E = number of dependency edges. This is optimal — you must examine every node and edge at least once to determine a valid order.

---

## One Minute Insight

> **In-degree zero means "ready to run."** Kahn's algorithm works by continuously asking: *who's unblocked right now?* The elegance is that cycle detection is free — if anything stays blocked forever, it must be in a cycle.

Next time `npm install` runs in 200ms and somehow installs 800 packages in exactly the right order, that's a topological sort running on a graph you never had to draw. The same algorithm runs inside Webpack, Gradle, Kubernetes, and every CI system you've ever used.

*Run `code.py` or `code.js` to see it in action.*
