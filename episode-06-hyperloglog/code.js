// HyperLogLog: estimate the number of distinct items in a stream
// using a fixed, tiny amount of memory — no matter how large the stream is.

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;                     // bits used to pick a register
    this.m = 1 << b;                // number of registers (e.g. 1024)
    this.registers = new Uint8Array(this.m);
    this.alpha = 0.7213 / (1 + 1.079 / this.m);
  }

  static hash(str) {
    // 32-bit FNV-1a — fast and well distributed, good enough for this demo.
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  add(item) {
    const x = HyperLogLog.hash(String(item));
    const bucket = x & (this.m - 1);           // low bits choose the register
    const remaining = x >>> this.b;            // remaining bits decide the rank
    const leadingZeros = Math.clz32(remaining) - this.b;
    const rank = leadingZeros + 1;
    if (rank > this.registers[bucket]) this.registers[bucket] = rank;
  }

  count() {
    let sum = 0;
    let zeroRegisters = 0;
    for (const r of this.registers) {
      sum += Math.pow(2, -r);
      if (r === 0) zeroRegisters++;
    }

    const rawEstimate = (this.alpha * this.m * this.m) / sum;

    // Small-range correction: fall back to linear counting when
    // most registers are still empty.
    if (rawEstimate <= 2.5 * this.m && zeroRegisters > 0) {
      return Math.round(this.m * Math.log(this.m / zeroRegisters));
    }
    return Math.round(rawEstimate);
  }
}

// Demo: count unique users in a stream of 1,000,000 events using ~1 KB of memory.
const hll = new HyperLogLog(10); // 1024 registers
const trueUnique = new Set();

for (let i = 0; i < 1_000_000; i++) {
  const userId = `user-${i % 250000}`; // 250,000 unique IDs, repeated 4x
  hll.add(userId);
  trueUnique.add(userId);
}

console.log("HyperLogLog estimate:", hll.count());
console.log("Actual unique count :", trueUnique.size);
