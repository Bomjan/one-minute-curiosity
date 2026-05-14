const crypto = require("crypto");

class BloomFilter {
  constructor(capacity, falsePositiveRate = 0.01) {
    // Optimal bit array size: m = -n * ln(p) / (ln(2)^2)
    this.size = Math.ceil(
      (-capacity * Math.log(falsePositiveRate)) / Math.log(2) ** 2
    );
    // Optimal number of hash functions: k = (m/n) * ln(2)
    this.hashCount = Math.max(1, Math.round((this.size / capacity) * Math.log(2)));

    this.bits = new Uint8Array(Math.ceil(this.size / 8));
    this.capacity = capacity;
    this.fpRate = falsePositiveRate;
  }

  *_hashes(item) {
    const h1 = BigInt("0x" + crypto.createHash("md5").update(item).digest("hex"));
    const h2 = BigInt("0x" + crypto.createHash("sha1").update(item).digest("hex"));
    const m = BigInt(this.size);
    for (let i = 0; i < this.hashCount; i++) {
      yield Number((h1 + BigInt(i) * h2) % m);
    }
  }

  _setBit(index) {
    this.bits[Math.floor(index / 8)] |= 1 << index % 8;
  }

  _getBit(index) {
    return !!(this.bits[Math.floor(index / 8)] & (1 << index % 8));
  }

  add(item) {
    for (const pos of this._hashes(item)) {
      this._setBit(pos);
    }
  }

  contains(item) {
    // false = definitely not present, true = probably present
    for (const pos of this._hashes(item)) {
      if (!this._getBit(pos)) return false;
    }
    return true;
  }
}

// --- Demo ---
const bf = new BloomFilter(1000, 0.01);

const emails = ["alice@example.com", "bob@example.com", "charlie@example.com"];
emails.forEach((e) => bf.add(e));

console.log("=== Bloom Filter Demo ===\n");

const testCases = [
  ["alice@example.com", true],
  ["bob@example.com", true],
  ["charlie@example.com", true],
  ["dave@example.com", false],
  ["eve@example.com", false],
  ["frank@example.com", false],
];

for (const [email, wasInserted] of testCases) {
  const result = bf.contains(email);
  const label = result ? "Probably YES " : "Definitely NO";
  const status = result === wasInserted ? "✓" : "✗ (false positive)";
  console.log(`  ${email.padEnd(30)} → ${label}  ${status}`);
}

console.log(`\nBit array size : ${bf.size.toLocaleString()} bits (${Math.floor(bf.size / 8).toLocaleString()} bytes)`);
console.log(`Hash functions : ${bf.hashCount}`);
console.log(`Target FP rate : ${(bf.fpRate * 100).toFixed(1)}%`);

// Measure actual false positive rate over 10,000 random strings
function randomEmail() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const user = Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `${user}@notinserted.com`;
}

const trials = 10_000;
let falsePositives = 0;
for (let i = 0; i < trials; i++) {
  if (bf.contains(randomEmail())) falsePositives++;
}
console.log(`\nMeasured FP rate : ${((falsePositives / trials) * 100).toFixed(2)}% over ${trials.toLocaleString()} trials`);
