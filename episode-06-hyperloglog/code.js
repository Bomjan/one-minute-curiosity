function fnv1aHash(str) {
    // Deterministic 32-bit hash of a string
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // force unsigned 32-bit
}

const HASH_BITS = 32;

function leadingZeros(x, bits) {
    if (x === 0) return bits;
    let count = 0;
    for (let i = bits - 1; i >= 0; i--) {
        if ((x >> i) & 1) break;
        count++;
    }
    return count;
}

function hyperLogLogEstimate(items, b = 4) {
    const m = 1 << b;
    const registers = new Array(m).fill(0);
    const remainderBits = HASH_BITS - b;

    for (const item of items) {
        const h = fnv1aHash(String(item));
        const bucket = h & (m - 1);        // last b bits choose the register
        const remainder = h >>> b;         // remaining bits get scanned
        const runLength = leadingZeros(remainder, remainderBits) + 1;
        registers[bucket] = Math.max(registers[bucket], runLength);
    }

    const alpha = 0.7213 / (1 + 1.079 / m);
    const sumInverses = registers.reduce((acc, r) => acc + Math.pow(2, -r), 0);
    let estimate = (alpha * m * m) / sumInverses;

    // Small-cardinality correction: when few registers are touched, the raw
    // estimator is biased, so fall back to linear counting (Flajolet et al.)
    const emptyRegisters = registers.filter((r) => r === 0).length;
    if (estimate <= 2.5 * m && emptyRegisters > 0) {
        estimate = m * Math.log(m / emptyRegisters);
    }

    return Math.round(estimate);
}

// Test 1: A tiny stream with obvious duplicates
const smallStream = ["alice", "bob", "alice", "carol", "bob", "dave", "alice"];
console.log(`Small stream (exact=4): estimate = ${hyperLogLogEstimate(smallStream)}`);

// Test 2: A million unique users, estimated with more registers for accuracy
const bigStream = Array.from({ length: 1_000_000 }, (_, i) => `user-${i}`);
console.log(`Big stream (exact=1,000,000): estimate = ${hyperLogLogEstimate(bigStream, 10)}`);
