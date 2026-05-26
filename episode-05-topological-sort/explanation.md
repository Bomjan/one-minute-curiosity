# The Order of Everything: Topological Sort

Every time you run `npm install`, `pip install`, or `apt-get install`, a quiet algorithm figures out the correct installation order. Install the wrong package first and the whole thing breaks. That algorithm is **Topological Sort**.

---

## The Problem

You have a directed graph of tasks where some tasks must happen *before* others. There are no cycles (it's a DAG — Directed Acyclic Graph). Your job: produce a valid linear ordering of all nodes where every dependency comes before the node that depends on it.

**Real-world framing:** You're a build system. Package `A` depends on `B` and `C`. Package `B` depends on `D`. Package `C` depends on `D`. What order do you install them?

```
A → B → D
A → C → D
```

You must install `D` before `B` and `C`, and both of those before `A`.

---

## Example

**Input:**
```
edges = [
  ("A", "B"),   # A depends on B
  ("A", "C"),   # A depends on C
  ("B", "D"),   # B depends on D
  ("C", "D"),   # C depends on D
]
```

**Valid Output:**
```
D → B → C → A   (or D → C → B → A)
```

Both are correct — topological sort may have multiple valid answers.

---

## Why It Matters

Topological sort powers:

- **Package managers** — npm, pip, Maven, apt all resolve install order with this
- **Build systems** — Make, Bazel, Gradle compute task dependency order
- **Compilers** — resolving symbol definitions before use
- **Course prerequisites** — scheduling which lectures must come first
- **Spreadsheet engines** — evaluating cells in dependency order
- **CI/CD pipelines** — determining which jobs can run in parallel vs. sequence

If you've ever seen a "circular dependency" error, you've seen what happens when this algorithm *fails to find a valid answer*.

---

## Solution

**Kahn's Algorithm (BFS-based):**

The key insight: a node with **zero incoming edges** (in-degree 0) has no dependencies — it's safe to process first. After processing it, remove it from the graph and decrement the in-degree of its neighbors. Repeat.

```
1. Compute in-degree for every node
2. Add all zero in-degree nodes to a queue
3. While queue is not empty:
   a. Dequeue a node, add to result
   b. For each neighbor, decrement its in-degree
   c. If neighbor's in-degree hits 0, enqueue it
4. If result length != total nodes → cycle detected (impossible ordering)
```

**Why it works:** We always process "safe" nodes first — those with no remaining dependencies. Removing them reveals the next safe layer.

---

## Code

### Python

```python
from collections import deque

def topological_sort(nodes, edges):
    in_degree = {node: 0 for node in nodes}
    graph = {node: [] for node in nodes}

    for src, dst in edges:
        graph[src].append(dst)
        in_degree[dst] += 1

    queue = deque([n for n in nodes if in_degree[n] == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)

        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(nodes):
        raise ValueError("Cycle detected — no valid ordering exists")

    return order


nodes = ["A", "B", "C", "D"]
edges = [("A", "B"), ("A", "C"), ("B", "D"), ("C", "D")]
print(topological_sort(nodes, edges))
# Output: ['A', 'B', 'C', 'D'] — processes dependents first
```

Wait — we need dependencies *before* dependents. Reverse the edge direction so edges point from dependency to dependent:

```python
nodes = ["A", "B", "C", "D"]
# Edge means "B must come before A"
edges = [("B", "A"), ("C", "A"), ("D", "B"), ("D", "C")]
print(topological_sort(nodes, edges))
# Output: ['D', 'B', 'C', 'A']
```

---

### JavaScript

```javascript
function topologicalSort(nodes, edges) {
    const inDegree = Object.fromEntries(nodes.map(n => [n, 0]));
    const graph = Object.fromEntries(nodes.map(n => [n, []]));

    for (const [src, dst] of edges) {
        graph[src].push(dst);
        inDegree[dst]++;
    }

    const queue = nodes.filter(n => inDegree[n] === 0);
    const order = [];

    while (queue.length > 0) {
        const node = queue.shift();
        order.push(node);

        for (const neighbor of graph[node]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    if (order.length !== nodes.length) {
        throw new Error("Cycle detected — no valid ordering exists");
    }

    return order;
}

const nodes = ["A", "B", "C", "D"];
const edges = [["B", "A"], ["C", "A"], ["D", "B"], ["D", "C"]];
console.log(topologicalSort(nodes, edges));
// Output: [ 'D', 'B', 'C', 'A' ]
```

---

## Complexity

| | Complexity |
|---|---|
| **Time** | O(V + E) — each node and edge processed exactly once |
| **Space** | O(V + E) — for the adjacency list and in-degree map |

Where `V` = number of nodes, `E` = number of edges.

This is optimal — you have to look at every dependency at least once.

---

## One Minute Insight

> **Topological sort doesn't just find an order — it detects the impossible.**
> If the algorithm can't sort all nodes, there's a cycle in your dependency graph.
> That's exactly how `npm` tells you about circular dependencies.
> The absence of a valid answer *is* the answer.

---

*Episode 05 · One Minute Curiosity · Graph Theory*
