function collisionProbability(n, buckets) {
    // Probability that n random items land in the same bucket at least once.
    if (n > buckets) return 1;
    let probNoCollision = 1;
    for (let i = 0; i < n; i++) {
        probNoCollision *= (buckets - i) / buckets;
    }
    return 1 - probNoCollision;
}

function itemsNeededFor50Percent(buckets) {
    // Birthday bound: ~1.1774 * sqrt(buckets) items give a 50% collision chance.
    return Math.ceil(1.1774 * Math.sqrt(buckets));
}

function findFirstCollision(bitLength = 16) {
    // Simulate a birthday attack: hash random inputs until two collide.
    const space = 2 ** bitLength;
    const seen = new Set();
    let attempts = 0;
    while (true) {
        attempts++;
        const item = Math.floor(Math.random() * space);
        if (seen.has(item)) return attempts;
        seen.add(item);
    }
}

// The classic version: 365 days, 23 people
console.log(`P(shared birthday) with 23 people: ${(collisionProbability(23, 365) * 100).toFixed(2)}%`);
console.log(`People needed for 50% odds: ${itemsNeededFor50Percent(365)}`);

// Same math, applied to a hash table
const hashSpace = 2 ** 16; // a 16-bit hash
console.log(`\n16-bit hash space needs only ~${itemsNeededFor50Percent(hashSpace)} items for a 50% collision chance`);

console.log(`Simulated collision found after ${findFirstCollision(16)} random 16-bit hashes`);
