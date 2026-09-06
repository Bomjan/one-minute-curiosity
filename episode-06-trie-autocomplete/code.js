class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
    }

    #findNode(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            if (!node.children.has(ch)) return null;
            node = node.children.get(ch);
        }
        return node;
    }

    search(word) {
        const node = this.#findNode(word);
        return node !== null && node.isEnd;
    }

    startsWith(prefix) {
        return this.#findNode(prefix) !== null;
    }

    autocomplete(prefix) {
        // Walk to the prefix's node, then collect every complete word below it.
        const node = this.#findNode(prefix);
        if (node === null) return [];

        const results = [];
        const collect = (node, path) => {
            if (node.isEnd) results.push(prefix + path);
            for (const [ch, child] of node.children) collect(child, path + ch);
        };

        collect(node, "");
        return results.sort();
    }
}

const trie = new Trie();
for (const word of ["cat", "car", "cart", "curiosity", "curious", "cup"]) {
    trie.insert(word);
}

console.log(trie.search("car"));       // true
console.log(trie.startsWith("cu"));    // true
console.log(trie.startsWith("care"));  // false
console.log(trie.autocomplete("cur")); // [ 'curiosity', 'curious' ]
console.log(trie.autocomplete("ca"));  // [ 'car', 'cart', 'cat' ]
