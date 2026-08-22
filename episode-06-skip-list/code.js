class SkipListNode {
    constructor(value, level) {
        this.value = value;
        this.forward = new Array(level + 1).fill(null);
    }
}

class SkipList {
    constructor(maxLevel = 16, p = 0.5) {
        this.maxLevel = maxLevel;
        this.p = p;
        this.level = 0;
        this.head = new SkipListNode(null, maxLevel);
    }

    _randomLevel() {
        // Keep "flipping heads" to climb levels, capped at maxLevel
        let level = 0;
        while (Math.random() < this.p && level < this.maxLevel) level++;
        return level;
    }

    insert(value) {
        const update = new Array(this.maxLevel + 1).fill(this.head);
        let current = this.head;

        // Walk down from the top, remembering the last node touched per level
        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < value) {
                current = current.forward[i];
            }
            update[i] = current;
        }

        const newLevel = this._randomLevel();
        if (newLevel > this.level) {
            for (let i = this.level + 1; i <= newLevel; i++) update[i] = this.head;
            this.level = newLevel;
        }

        const node = new SkipListNode(value, newLevel);
        for (let i = 0; i <= newLevel; i++) {
            node.forward[i] = update[i].forward[i];
            update[i].forward[i] = node;
        }
    }

    search(value) {
        let current = this.head;
        let hops = 0;

        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < value) {
                current = current.forward[i];
                hops++;
            }
        }

        current = current.forward[0];
        hops++;
        const found = current !== null && current.value === value;
        return { found, hops };
    }
}

const sl = new SkipList();
[3, 6, 7, 9, 12, 19, 17, 26, 21, 25].forEach((v) => sl.insert(v));

console.log("Search 19 ->", sl.search(19));
console.log("Search 15 ->", sl.search(15));
