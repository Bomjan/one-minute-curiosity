function routeRequests(numServers, numRequests, choices = 2) {
    // Distribute requests across servers using the 'power of d choices' rule
    const loads = new Array(numServers).fill(0);

    for (let i = 0; i < numRequests; i++) {
        // Sample `choices` random servers and pick the least loaded
        const candidates = new Set();
        while (candidates.size < choices) {
            candidates.add(Math.floor(Math.random() * numServers));
        }
        const best = [...candidates].reduce((a, b) => (loads[a] <= loads[b] ? a : b));
        loads[best]++;
    }

    return loads;
}

// Baseline: pure random assignment (choices=1 means "no comparison")
const randomLoads = routeRequests(20, 20, 1);
console.log(`Random (1 choice)   max load: ${Math.max(...randomLoads)}`, randomLoads);

// Power of two choices: pick the better of 2 random servers
const p2cLoads = routeRequests(20, 20, 2);
console.log(`Power of two choices max load: ${Math.max(...p2cLoads)}`, p2cLoads);
