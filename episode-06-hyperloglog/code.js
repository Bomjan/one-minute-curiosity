/**
 * HyperLogLog: estimate how many UNIQUE items you've seen using a fixed,
 * tiny amount of memory -- no matter how many items pass through.
 */

const crypto = require('crypto');

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b; // number of registers (buckets)
    this.registers = new Array(this.m).fill(0);

    if (this.m === 16) this.alpha = 0.673;
    else if (this.m === 32) this.alpha = 0.697;
    else if (this.m === 64) this.alpha = 0.709;
    else this.alpha = 0.7213 / (1 + 1.079 / this.m);
  }

  _hash(item) {
    const digest = crypto.createHash('sha1').update(String(item)).digest();
    return digest.readBigUInt64BE(0); // 64-bit hash as BigInt
  }

  _rank(w, width) {
    // Position of the leftmost 1-bit within `width` bits (1-indexed).
    if (w === 0n) return width + 1;
    return width - w.toString(2).length + 1;
  }

  add(item) {
    const x = this._hash(item);
    const bucket = Number(x >> BigInt(64 - this.b));   // top b bits pick a register
    const mask = (1n << BigInt(64 - this.b)) - 1n;
    const w = x & mask;                                 // remaining bits measure "rarity"
    const rank = this._rank(w, 64 - this.b);
    this.registers[bucket] = Math.max(this.registers[bucket], rank);
  }

  count() {
    let z = 0;
    for (const r of this.registers) z += Math.pow(2, -r);
    let estimate = (this.alpha * this.m * this.m) / z;

    // For small cardinalities, fall back to linear counting -- it's more accurate.
    const zeros = this.registers.filter((r) => r === 0).length;
    if (estimate <= 2.5 * this.m && zeros > 0) {
      estimate = this.m * Math.log(this.m / zeros);
    }

    return Math.round(estimate);
  }
}

const hll = new HyperLogLog(10); // 1024 registers, ~3% typical error

const uniqueVisitors = Array.from({ length: 100000 }, (_, i) => `user_${i}`);
for (const visitor of uniqueVisitors) hll.add(visitor);

console.log('Real count:  ', uniqueVisitors.length);
console.log('HLL estimate:', hll.count());
console.log('Memory used: ', hll.m, 'small integers -- not 100,000 strings');
