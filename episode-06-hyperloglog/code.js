// HyperLogLog — estimate the number of DISTINCT items in a huge stream
// using a fixed, tiny amount of memory (a handful of registers).

// Deterministic 32-bit hash (FNV-1a + a finalizer for a clean avalanche).
function hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

// Position of the leftmost 1-bit in a `width`-bit number (1-indexed).
function rho(w, width) {
    if (w === 0) return width + 1;
    return width - (31 - Math.clz32(w));
}

function hyperloglogEstimate(stream, b = 4) {
    const m = 1 << b;
    const registers = new Array(m).fill(0);
    const tailWidth = 32 - b;

    for (const item of stream) {
        const x = hash32(String(item));
        const j = x & (m - 1);   // last b bits pick a register
        const w = x >>> b;        // remaining bits measure a "run of zeros"
        registers[j] = Math.max(registers[j], rho(w, tailWidth));
    }

    const alpha = m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / m);
    const sumInverse = registers.reduce((acc, r) => acc + 2 ** -r, 0);
    const rawEstimate = (alpha * m * m) / sumInverse;

    // small-cardinality correction (linear counting)
    if (rawEstimate <= 2.5 * m) {
        const zeroRegisters = registers.filter((r) => r === 0).length;
        if (zeroRegisters) return Math.round(m * Math.log(m / zeroRegisters));
    }

    return Math.round(rawEstimate);
}

// 100,000 events, only 5,000 truly distinct visitor IDs
const stream = Array.from({ length: 100000 }, (_, i) => `visitor-${i % 5000}`);

const exact = new Set(stream).size;
const estimate = hyperloglogEstimate(stream, 10); // 1024 registers = 4KB

const error = (Math.abs(estimate - exact) / exact) * 100;

console.log(`Exact distinct count : ${exact}`);
console.log(`HyperLogLog estimate : ${estimate}`);
console.log(`Error                : ${error.toFixed(2)}%`);
console.log("Memory used           : a few KB, regardless of stream length");
