class SkipListNode {
    constructor(value, level) {
        this.value = value;
        this.forward = new Array(level + 1).fill(null);
    }
}

class SkipList {
    constructor(maxLevel = 4, p = 0.5) {
        this.maxLevel = maxLevel;
        this.p = p;
        this.header = new SkipListNode(null, maxLevel);
        this.level = 0;
    }

    // Flip a coin: heads keeps promoting to a higher express lane
    randomLevel() {
        let lvl = 0;
        while (Math.random() < this.p && lvl < this.maxLevel) lvl++;
        return lvl;
    }

    insert(value) {
        const update = new Array(this.maxLevel + 1).fill(this.header);
        let current = this.header;

        // Walk down from the top lane, remembering where we last turned
        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < value) {
                current = current.forward[i];
            }
            update[i] = current;
        }

        const newLevel = this.randomLevel();
        if (newLevel > this.level) {
            for (let i = this.level + 1; i <= newLevel; i++) update[i] = this.header;
            this.level = newLevel;
        }

        const newNode = new SkipListNode(value, newLevel);
        for (let i = 0; i <= newLevel; i++) {
            newNode.forward[i] = update[i].forward[i];
            update[i].forward[i] = newNode;
        }
    }

    search(target) {
        let current = this.header;
        let hops = 0;

        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < target) {
                current = current.forward[i];
                hops++;
            }
        }

        current = current.forward[0];
        hops++;

        if (current && current.value === target) return { found: true, hops };
        return { found: false, hops };
    }
}

const sl = new SkipList();
[3, 6, 7, 9, 12, 19, 17, 26, 21, 25].forEach((v) => sl.insert(v));

let result = sl.search(19);
console.log(`Found 19: ${result.found} in ${result.hops} hops`); // true, far fewer than 10

result = sl.search(100);
console.log(`Found 100: ${result.found} in ${result.hops} hops`); // false
