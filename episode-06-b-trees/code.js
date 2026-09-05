// B-Tree: the shallow, wide search tree databases build storage engines on.
//
// A binary search tree gets tall fast (height ~ log2(n)) -- fine in memory,
// brutal on disk where every level is a seek. A B-tree keeps hundreds of
// keys per node, so a billion-row index stays only 3-4 levels deep.

class BTreeNode {
    constructor(leaf = true) {
        this.leaf = leaf;
        this.keys = [];
        this.children = [];
    }
}

class BTree {
    // Minimum degree t: every non-root node holds between t-1 and 2t-1 keys.
    constructor(t = 2) {
        this.t = t;
        this.root = new BTreeNode(true);
    }

    search(key, node = this.root) {
        let i = 0;
        while (i < node.keys.length && key > node.keys[i]) i++;
        if (i < node.keys.length && node.keys[i] === key) return true;
        if (node.leaf) return false;
        return this.search(key, node.children[i]);
    }

    insert(key) {
        const t = this.t;
        const root = this.root;
        // A full root can't absorb another key, so split it first and grow upward.
        if (root.keys.length === 2 * t - 1) {
            const newRoot = new BTreeNode(false);
            newRoot.children.push(root);
            this._splitChild(newRoot, 0);
            this.root = newRoot;
        }
        this._insertNonFull(this.root, key);
    }

    _splitChild(parent, i) {
        const t = this.t;
        const child = parent.children[i];
        const newNode = new BTreeNode(child.leaf);

        const midKey = child.keys[t - 1];
        newNode.keys = child.keys.splice(t);
        child.keys.splice(t - 1);

        if (!child.leaf) {
            newNode.children = child.children.splice(t);
        }

        parent.children.splice(i + 1, 0, newNode);
        parent.keys.splice(i, 0, midKey);
    }

    _insertNonFull(node, key) {
        let i = node.keys.length - 1;
        if (node.leaf) {
            node.keys.push(null);
            while (i >= 0 && key < node.keys[i]) {
                node.keys[i + 1] = node.keys[i];
                i--;
            }
            node.keys[i + 1] = key;
        } else {
            while (i >= 0 && key < node.keys[i]) i--;
            i++;
            // Split a full child before descending, so there's always room.
            if (node.children[i].keys.length === 2 * this.t - 1) {
                this._splitChild(node, i);
                if (key > node.keys[i]) i++;
            }
            this._insertNonFull(node.children[i], key);
        }
    }

    inorder(node = this.root) {
        const result = [];
        node.keys.forEach((key, i) => {
            if (!node.leaf) result.push(...this.inorder(node.children[i]));
            result.push(key);
        });
        if (!node.leaf) result.push(...this.inorder(node.children[node.children.length - 1]));
        return result;
    }
}

const tree = new BTree(2); // each node holds at most 3 keys before splitting
[10, 20, 5, 6, 12, 30, 7, 17].forEach((key) => tree.insert(key));

console.log("Sorted keys:", tree.inorder()); // [5, 6, 7, 10, 12, 17, 20, 30]
console.log("Search 12:", tree.search(12));  // true
console.log("Search 99:", tree.search(99));  // false
