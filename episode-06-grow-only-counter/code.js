/**
 * The Like Button That Never Needs the Internet
 * A grow-only counter (G-Counter) CRDT: independent replicas increment locally,
 * then merge with element-wise max so the result is always correct — no matter
 * the order, timing, or duplication of merges.
 */

class GCounter {
    constructor(nodeId, allNodes) {
        this.nodeId = nodeId;
        this.counts = Object.fromEntries(allNodes.map(n => [n, 0]));
    }

    increment(amount = 1) {
        // A replica only ever writes to its own slot.
        this.counts[this.nodeId] += amount;
    }

    merge(otherCounts) {
        // Element-wise max: idempotent, commutative, associative.
        for (const [node, value] of Object.entries(otherCounts)) {
            this.counts[node] = Math.max(this.counts[node], value);
        }
    }

    value() {
        return Object.values(this.counts).reduce((a, b) => a + b, 0);
    }
}

const nodes = ["us", "eu", "asia"];
const us = new GCounter("us", nodes);
const eu = new GCounter("eu", nodes);
const asia = new GCounter("asia", nodes);

for (let i = 0; i < 5; i++) us.increment();
for (let i = 0; i < 3; i++) eu.increment();
for (let i = 0; i < 7; i++) asia.increment();

// Gossip, in any order, even with duplicates.
us.merge(eu.counts);
us.merge(asia.counts);
us.merge(eu.counts);   // duplicate sync — still safe

console.log(us.value());  // 15, always
