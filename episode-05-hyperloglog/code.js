const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 14) {
    // b=14 → 16384 registers, ~12 KB, ~0.81% standard error
    this.b = b;
    this.m = 1 << b;
    this.registers = new Uint8Array(this.m);
  }

  #hash(item) {
    return BigInt(
      "0x" + crypto.createHash("sha256").update(item).digest("hex")
    );
  }

  #leadingZeros(bits, width) {
    if (bits === 0n) return width;
    let count = 0;
    let mask = 1n << BigInt(width - 1);
    while (mask > 0n && (bits & mask) === 0n) {
      count++;
      mask >>= 1n;
    }
    return count + 1;
  }

  add(item) {
    const h = this.#hash(item);
    const registerIdx = Number(h >> BigInt(256 - this.b));
    const remaining = h & ((1n << BigInt(256 - this.b)) - 1n);
    const run = this.#leadingZeros(remaining, 256 - this.b);
    this.registers[registerIdx] = Math.max(this.registers[registerIdx], run);
  }

  count() {
    const alpha = 0.7213 / (1 + 1.079 / this.m);
    const rawEstimate =
      (alpha * this.m ** 2) /
      this.registers.reduce((sum, r) => sum + Math.pow(2, -r), 0);

    // Small range correction
    const zeros = this.registers.filter((r) => r === 0).length;
    if (rawEstimate <= 2.5 * this.m && zeros > 0) {
      return Math.round(this.m * Math.log(this.m / zeros));
    }

    return Math.round(rawEstimate);
  }

  toString() {
    const memKB = ((this.m * 5) / 8 / 1024).toFixed(1);
    const error = ((100 * 1.04) / Math.sqrt(this.m)).toFixed(2);
    return `HyperLogLog(b=${this.b}, registers=${this.m}, memory~${memKB} KB, error~${error}%)`;
  }
}

const hll = new HyperLogLog(14);
console.log(hll.toString());

const actual = new Set();
for (let i = 0; i < 1_000_000; i++) {
  const uid = Math.random().toString(36).slice(2, 14);
  actual.add(uid);
  hll.add(uid);
}

console.log(`Exact count:     ${actual.size.toLocaleString()}`);
console.log(`HyperLogLog est: ${hll.count().toLocaleString()}`);
const error = (
  (Math.abs(hll.count() - actual.size) / actual.size) *
  100
).toFixed(2);
console.log(`Error:           ${error}%`);
