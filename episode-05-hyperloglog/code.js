const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b;                    // number of registers = 2^b
    this.registers = new Uint8Array(this.m);
    this.alpha = this.#alpha(this.m);
  }

  #alpha(m) {
    if (m === 16) return 0.673;
    if (m === 32) return 0.697;
    if (m === 64) return 0.709;
    return 0.7213 / (1 + 1.079 / m);
  }

  #hash(item) {
    return BigInt(
      "0x" + crypto.createHash("sha256").update(String(item)).digest("hex")
    );
  }

  #leadingZeros(value, bits) {
    if (value === 0n) return bits;
    let count = 0;
    let mask = 1n << BigInt(bits - 1);
    while ((value & mask) === 0n) {
      count++;
      mask >>= 1n;
    }
    return count;
  }

  add(item) {
    const h = this.#hash(item);
    const remainingBits = 256 - this.b;
    const registerIndex = Number(h >> BigInt(remainingBits));
    const remainder = h & ((1n << BigInt(remainingBits)) - 1n);
    const runLength = this.#leadingZeros(remainder, remainingBits) + 1;
    this.registers[registerIndex] = Math.max(
      this.registers[registerIndex],
      runLength
    );
  }

  count() {
    let z = 0;
    for (const r of this.registers) z += Math.pow(2, -r);
    return Math.round(this.alpha * this.m * this.m / z);
  }
}

const hll = new HyperLogLog(10);
const actual = 100_000;

for (let i = 0; i < actual; i++) hll.add(`user_${i}`);
for (let i = 0; i < 50_000; i++) hll.add(`user_${i}`);  // duplicates

const estimate = hll.count();
const error = ((Math.abs(estimate - actual) / actual) * 100).toFixed(2);

console.log(`Actual unique items : ${actual.toLocaleString()}`);
console.log(`HyperLogLog estimate: ${estimate.toLocaleString()}`);
console.log(`Error               : ${error}%`);
console.log(`Memory (registers)  : ${hll.m} bytes`);
