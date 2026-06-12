function collisionProbability(n, d) {
    // Probability that at least 2 of n random picks from d options collide.
    if (n > d) return 1.0; // pigeonhole principle: guaranteed collision

    let probAllUnique = 1.0;
    for (let i = 0; i < n; i++) {
        probAllUnique *= (d - i) / d;
    }

    return 1 - probAllUnique;
}

function picksUntil50Percent(d) {
    // Smallest n where collision probability crosses 50%.
    let n = 1;
    while (collisionProbability(n, d) < 0.5) {
        n++;
    }
    return n;
}

function simulateCollision(d, trials = 10000) {
    // Monte Carlo check: average picks needed before a repeat appears.
    let totalPicks = 0;
    for (let t = 0; t < trials; t++) {
        const seen = new Set();
        let picks = 0;
        while (true) {
            picks++;
            const value = Math.floor(Math.random() * d);
            if (seen.has(value)) break;
            seen.add(value);
        }
        totalPicks += picks;
    }
    return totalPicks / trials;
}

// The classic: 365 days in a year, 23 people
const days = 365;
console.log(`Days: ${days}`);
console.log(`Probability of a shared birthday with 23 people: ${(collisionProbability(23, days) * 100).toFixed(2)}%`);
console.log(`People needed for >50% chance: ${picksUntil50Percent(days)}`);

// Now scale it up: a 6-character hex ID has 16^6 possibilities
const hexSpace = 16 ** 6;
const safeN = picksUntil50Percent(hexSpace);
console.log(`\nHex space size: ${hexSpace.toLocaleString()}`);
console.log(`IDs needed for >50% collision chance: ${safeN.toLocaleString()} (~sqrt of space)`);

// Sanity check with a quick simulation
const avgPicks = simulateCollision(hexSpace, 2000);
console.log(`Simulated average picks until first collision: ${avgPicks.toFixed(1)}`);
