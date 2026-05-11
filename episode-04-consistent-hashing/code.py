import hashlib
import bisect


class ConsistentHashRing:
    def __init__(self, nodes=None, virtual_nodes=150):
        self.virtual_nodes = virtual_nodes
        self.ring = {}
        self.sorted_keys = []
        for node in (nodes or []):
            self.add_node(node)

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node):
        for i in range(self.virtual_nodes):
            h = self._hash(f"{node}#vnode{i}")
            self.ring[h] = node
            bisect.insort(self.sorted_keys, h)

    def remove_node(self, node):
        for i in range(self.virtual_nodes):
            h = self._hash(f"{node}#vnode{i}")
            del self.ring[h]
            self.sorted_keys.remove(h)

    def get_node(self, key):
        if not self.ring:
            return None
        h = self._hash(key)
        idx = bisect.bisect(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]


def distribution_report(ring, keys):
    counts = {}
    for k in keys:
        node = ring.get_node(k)
        counts[node] = counts.get(node, 0) + 1
    return counts


if __name__ == "__main__":
    servers = ["server-A", "server-B", "server-C"]
    ring = ConsistentHashRing(nodes=servers)

    sample_keys = [f"user:{i}" for i in range(9)]

    print("=== Routing before removing server-B ===")
    for k in sample_keys:
        print(f"  {k:12} → {ring.get_node(k)}")

    ring.remove_node("server-B")

    print("\n=== Routing after removing server-B ===")
    changed = 0
    for k in sample_keys:
        node = ring.get_node(k)
        marker = " ← MOVED" if node != (lambda: None)() else ""
        print(f"  {k:12} → {node}")

    print("\n=== Load distribution across 10,000 keys (3 servers) ===")
    ring2 = ConsistentHashRing(nodes=servers)
    big_keys = [f"session:{i}" for i in range(10_000)]
    dist = distribution_report(ring2, big_keys)
    for server, count in sorted(dist.items()):
        bar = "█" * (count // 100)
        print(f"  {server}: {count:5} keys  {bar}")

    print("\n=== Load distribution after adding server-D ===")
    ring2.add_node("server-D")
    dist2 = distribution_report(ring2, big_keys)
    for server, count in sorted(dist2.items()):
        bar = "█" * (count // 100)
        print(f"  {server}: {count:5} keys  {bar}")
