function collisionProbability(n, d) {
    // Probability that n items drawn uniformly from d buckets share a bucket
    if (n > d) return 1.0;
    let pNoCollision = 1.0;
    for (let i = 0; i < n; i++) {
        pNoCollision *= (d - i) / d;
    }
    return 1 - pNoCollision;
}

function minItemsForCollision(d, targetProb = 0.5) {
    // Closed-form estimate: how many items until collision odds pass targetProb
    return Math.ceil(Math.sqrt(2 * d * Math.log(1 / (1 - targetProb))));
}

function simulateCollision(d, trials = 20000) {
    // Empirically measure the average draws until the first repeated bucket
    let totalDraws = 0;
    for (let t = 0; t < trials; t++) {
        const seen = new Set();
        let draws = 0;
        while (true) {
            draws++;
            const bucket = Math.floor(Math.random() * d);
            if (seen.has(bucket)) break;
            seen.add(bucket);
        }
        totalDraws += draws;
    }
    return totalDraws / trials;
}

// Classic birthday paradox: 365 possible birthdays
for (const n of [10, 20, 23, 30, 50]) {
    const p = collisionProbability(n, 365);
    console.log(`${n} people -> ${(p * 100).toFixed(1)}% chance of a shared birthday`);
}

console.log(`\nEstimated people needed for >50% odds: ${minItemsForCollision(365)}`);

// Hash collisions scale the exact same way: d = size of the hash space
const hashSpace = 2 ** 16; // toy 16-bit hash for a fast, visible demo
console.log(`\nToy 16-bit hash space (${hashSpace} buckets):`);
console.log(`  Closed-form estimate for 50% collision odds: ~${minItemsForCollision(hashSpace)} hashes`);
console.log(`  Empirical average draws to first collision:  ~${simulateCollision(hashSpace).toFixed(0)} hashes`);
console.log(`  (sqrt(hashSpace) = ${Math.sqrt(hashSpace).toFixed(0)}, matching the birthday bound)`);
