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

    return order.length === numNodes ? order : null;
}

function parallelStages(numNodes, edges) {
    const graph = Array.from({ length: numNodes }, () => []);
    const inDegree = new Array(numNodes).fill(0);

    for (const [src, dst] of edges) {
        graph[src].push(dst);
        inDegree[dst]++;
    }

    let currentWave = [];
    for (let i = 0; i < numNodes; i++) {
        if (inDegree[i] === 0) currentWave.push(i);
    }

    const stages = [];
    let total = 0;

    while (currentWave.length > 0) {
        stages.push([...currentWave]);
        total += currentWave.length;
        const nextWave = [];
        for (const node of currentWave) {
            for (const neighbor of graph[node]) {
                if (--inDegree[neighbor] === 0) nextWave.push(neighbor);
            }
        }
        currentWave = nextWave;
    }

    return total === numNodes ? stages : null;
}

// 0=config, 1=logger, 2=framework, 3=router, 4=auth
const labels = ["config", "logger", "framework", "router", "auth"];
const edges = [[0, 1], [1, 2], [2, 3], [1, 3], [0, 4], [4, 3]];

console.log("=== Install Order ===");
const result = topologicalSort(5, edges);
if (result) {
    console.log(result.map(i => labels[i]).join(" → "));
} else {
    console.log("Circular dependency detected!");
}

console.log("\n=== Parallel Build Stages ===");
const stages = parallelStages(5, edges);
if (stages) {
    stages.forEach((wave, i) => {
        console.log(`  Stage ${i + 1}: [${wave.map(n => labels[n]).join(", ")}]`);
    });
} else {
    console.log("Circular dependency detected!");
}

console.log("\n=== Cycle Detection ===");
const cycleEdges = [[0, 1], [1, 2], [2, 0]];
const cycleLabels = ["A", "B", "C"];
const cycleResult = topologicalSort(3, cycleEdges);
if (cycleResult === null) {
    const desc = cycleEdges.map(([s, d]) => `${cycleLabels[s]}→${cycleLabels[d]}`).join(", ");
    console.log(`Cycle found in graph: ${desc}`);
}
