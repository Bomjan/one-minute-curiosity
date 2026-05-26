/**
 * Kahn's Algorithm: BFS-based topological sort.
 * edges[i] = [src, dst] means src must come BEFORE dst.
 * Throws an error if a cycle is detected.
 */
function topologicalSort(nodes, edges) {
    const inDegree = Object.fromEntries(nodes.map(n => [n, 0]));
    const graph = Object.fromEntries(nodes.map(n => [n, []]));

    for (const [src, dst] of edges) {
        graph[src].push(dst);
        inDegree[dst]++;
    }

    // Start with all nodes that have no dependencies
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


// Package install order example
// Edge [A, B] means: install A before B
const packages = ["webpack", "babel", "react", "react-dom"];
const deps = [
    ["babel", "webpack"],
    ["react", "react-dom"],
    ["babel", "react"],
];
console.log("Install order:", topologicalSort(packages, deps));

// CI pipeline task ordering
const tasks = ["lint", "test", "build", "deploy", "notify"];
const pipeline = [
    ["lint", "test"],
    ["test", "build"],
    ["build", "deploy"],
    ["deploy", "notify"],
];
console.log("Pipeline order:", topologicalSort(tasks, pipeline));

// Cycle detection
try {
    topologicalSort(["X", "Y"], [["X", "Y"], ["Y", "X"]]);
} catch (e) {
    console.log(`Caught: ${e.message}`);
}
