# How Your Package Manager Knows the Right Install Order

Every time you run `npm install` or `pip install`, a quiet algorithm decides which packages get installed first. It never guesses. It never installs a library before its own dependencies are ready. And when you create a circular dependency — `A needs B, B needs A` — it catches it before your build explodes.

That algorithm is **Topological Sort**.

---

## The Problem

You have a set of tasks (or packages, or build steps) where some must happen *before* others. Given a directed graph of those dependencies, find a valid execution order — or report that no valid order exists.

```
Task D depends on Task B
Task B depends on Task C
Task A depends on Task B
Task C has no dependencies

Valid order: C → B → A → D   (or C → B → D → A)
```

If `A` depends on `B` and `B` depends on `A`, you have a **cycle**. No valid order exists, and the algorithm tells you so.

---

## Example

```
Dependencies:
  "framework"  needs  "logger"
  "logger"     needs  "config"
  "config"     needs  nothing
  "router"     needs  "framework"

Dependency graph (edges point FROM requirement TO dependent):
  config → logger → framework → router

Topological order: config, logger, framework, router
```

If you tried to install `framework` first, it would fail — `logger` isn't there yet. Topological sort gives you the one (or one of many valid) order where this never happens.

---

## Why It Matters

Nearly every build or orchestration system relies on this:

| System | Topological Sort Use |
| :--- | :--- |
| **npm / pip / cargo** | Package install order |
| **Makefile / Gradle / Bazel** | Build target sequencing |
| **Kubernetes** | Init container ordering |
| **Git** | Commit ancestry traversal |
| **SQL query planners** | Join and subquery ordering |
| **Excel / spreadsheets** | Cell formula recalculation |
| **CI/CD pipelines** | Stage dependency resolution |

It also powers **deadlock detection** in operating systems and **cycle detection** in compiler dependency graphs.

---

## Solution

### Kahn's Algorithm (BFS-based)

The insight: a node with **zero incoming edges** has no unmet dependencies — it can always go first.

```
1. Count how many incoming edges each node has (its "in-degree").
2. Enqueue all nodes whose in-degree is 0.
3. While the queue isn't empty:
     - Dequeue a node and add it to the result.
     - For each of its neighbors, decrement their in-degree by 1.
     - If a neighbor's in-degree hits 0, enqueue it.
4. If result contains all nodes → valid order found.
   If not → a cycle exists (some nodes could never reach in-degree 0).
```

### Why Kahn's over DFS?

- **Cycle detection is free**: if `len(result) < len(nodes)`, you have a cycle.
- **Intuitive**: you're always "peeling off" the outermost dependency layer.
- **Parallelism hint**: all nodes in the queue at the same time have no dependency on each other — they can run in parallel.

---

## Code

### Python

```python
from collections import deque

def topological_sort(num_nodes, edges):
    graph = [[] for _ in range(num_nodes)]
    in_degree = [0] * num_nodes

    for src, dst in edges:
        graph[src].append(dst)
        in_degree[dst] += 1

    queue = deque(n for n in range(num_nodes) if in_degree[n] == 0)
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == num_nodes else None  # None = cycle detected


if __name__ == "__main__":
    # 0=config, 1=logger, 2=framework, 3=router
    # config→logger, logger→framework, framework→router, logger→router
    edges = [(0, 1), (1, 2), (2, 3), (1, 3)]
    labels = ["config", "logger", "framework", "router"]

    result = topological_sort(4, edges)
    if result:
        print("Install order:", " → ".join(labels[i] for i in result))
    else:
        print("Circular dependency detected!")

    # Cycle example: 0→1→2→0
    cycle_edges = [(0, 1), (1, 2), (2, 0)]
    print("Cycle test:", topological_sort(3, cycle_edges))  # None
```

### JavaScript

```javascript
function topologicalSort(numNodes, edges) {
    const graph = Array.from({ length: numNodes }, () => []);
    const inDegree = new Array(numNodes).fill(0);

    for (const [src, dst] of edges) {
        graph[src].push(dst);
        inDegree[dst]++;
    }

    const queue = [];
    for (let i = 0; i < numNodes; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }

    const order = [];
    let head = 0;

    while (head < queue.length) {
        const node = queue[head++];
        order.push(node);
        for (const neighbor of graph[node]) {
            if (--inDegree[neighbor] === 0) queue.push(neighbor);
        }
    }

    return order.length === numNodes ? order : null; // null = cycle
}

// 0=config, 1=logger, 2=framework, 3=router
const edges = [[0, 1], [1, 2], [2, 3], [1, 3]];
const labels = ["config", "logger", "framework", "router"];

const result = topologicalSort(4, edges);
if (result) {
    console.log("Install order:", result.map(i => labels[i]).join(" → "));
} else {
    console.log("Circular dependency detected!");
}

// Cycle test
console.log("Cycle test:", topologicalSort(3, [[0, 1], [1, 2], [2, 0]])); // null
```

---

## Complexity

| Dimension | Value | Notes |
| :--- | :--- | :--- |
| **Time** | O(V + E) | Visit each vertex and edge exactly once |
| **Space** | O(V + E) | Adjacency list, in-degree array, queue |
| **Cycle detection** | Free | Falls out of the length check at the end |

`V` = number of nodes (packages, tasks), `E` = number of dependency edges. As efficient as it gets for this problem — you *must* look at every dependency at least once.

---

## One Minute Insight

> **Topological sort doesn't just order things — it *proves* an ordering is possible.**

When `npm` tells you "circular dependency detected," it's not just raising an error. It ran Kahn's algorithm, produced a result shorter than the node count, and handed you the proof that no valid install order exists.

The deeper insight: **the queue at any moment holds all currently "unblocked" nodes**. That's not just ordering — it's a parallelism map. Build systems like Bazel and Gradle use this directly: every node in the queue right now can be compiled simultaneously. Topological sort is the engine behind parallel builds.

*Run `code.py` or `code.js` to see install ordering in action — and watch the cycle example return `None` / `null` instead of crashing.*
