class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def _find_node(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def search(self, word):
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find_node(prefix) is not None

    def autocomplete(self, prefix):
        # Walk to the prefix's node, then collect every complete word below it.
        node = self._find_node(prefix)
        if node is None:
            return []

        results = []

        def collect(node, path):
            if node.is_end:
                results.append(prefix + path)
            for ch, child in node.children.items():
                collect(child, path + ch)

        collect(node, "")
        return sorted(results)


if __name__ == "__main__":
    trie = Trie()
    for word in ["cat", "car", "cart", "curiosity", "curious", "cup"]:
        trie.insert(word)

    print(trie.search("car"))          # True
    print(trie.starts_with("cu"))      # True
    print(trie.starts_with("care"))    # False
    print(trie.autocomplete("cur"))    # ['curiosity', 'curious']
    print(trie.autocomplete("ca"))     # ['car', 'cart', 'cat']
