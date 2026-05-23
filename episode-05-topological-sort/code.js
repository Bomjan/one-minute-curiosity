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

    return order.length === numTasks ? order : [];
}

console.log("Valid order:      ", topologicalSort(6, [[5,2],[5,0],[4,0],[4,1],[2,3],[3,1]]));
console.log("Cycle detected:   ", topologicalSort(3, [[0,1],[1,2],[2,0]]));
console.log("Build pipeline:   ", topologicalSort(5, [[0,1],[0,2],[1,3],[2,3],[3,4]]));
