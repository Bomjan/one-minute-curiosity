// Tracks causal order across distributed nodes without a shared clock.
class VectorClock {
    constructor(nodeId, nodes) {
        this.nodeId = nodeId;
        this.clock = Object.fromEntries(nodes.map((n) => [n, 0]));
    }

    tick() {
        // Local event: bump this node's own counter.
        this.clock[this.nodeId] += 1;
        return { ...this.clock };
    }

    merge(otherClock) {
        // Receive a message: absorb the max of every slot, then tick.
        for (const [node, count] of Object.entries(otherClock)) {
            this.clock[node] = Math.max(this.clock[node] ?? 0, count);
        }
        return this.tick();
    }

    static compare(a, b) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        let aLeB = true;
        let bLeA = true;
        for (const k of keys) {
            const av = a[k] ?? 0;
            const bv = b[k] ?? 0;
            if (av > bv) aLeB = false;
            if (bv > av) bLeA = false;
        }
        if (aLeB && bLeA) return "equal";
        if (aLeB) return "before";
        if (bLeA) return "after";
        return "concurrent";
    }
}

const nodes = ["A", "B", "C"];
const [a, b, c] = nodes.map((n) => new VectorClock(n, nodes));

const aSnapshot = a.tick();             // A writes locally
const bSnapshot = b.merge(aSnapshot);   // B receives A's message, then writes
const cSnapshot = c.tick();             // C writes independently

console.log("A:", aSnapshot);
console.log("B:", bSnapshot);
console.log("C:", cSnapshot);

console.log("A vs B:", VectorClock.compare(aSnapshot, bSnapshot)); // before
console.log("B vs C:", VectorClock.compare(bSnapshot, cSnapshot)); // concurrent
