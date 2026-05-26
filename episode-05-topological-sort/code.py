from collections import deque


def topological_sort(nodes, edges):
    """
    Kahn's Algorithm: BFS-based topological sort.
    edges[i] = (src, dst) means src must come BEFORE dst.
    Raises ValueError if a cycle is detected.
    """
    in_degree = {node: 0 for node in nodes}
    graph = {node: [] for node in nodes}

    for src, dst in edges:
        graph[src].append(dst)
        in_degree[dst] += 1

    # Start with all nodes that have no dependencies
    queue = deque([n for n in nodes if in_degree[n] == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)

        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(nodes):
        raise ValueError("Cycle detected — no valid ordering exists")

    return order


if __name__ == "__main__":
    # Package install order example
    # Edge (A, B) means: install A before B
    packages = ["webpack", "babel", "react", "react-dom"]
    deps = [
        ("babel", "webpack"),
        ("react", "react-dom"),
        ("babel", "react"),
    ]
    print("Install order:", topological_sort(packages, deps))
    # One valid output: ['webpack', 'react-dom', 'babel', 'react']
    # (babel and react come last since they depend on others)

    # Course prerequisite example
    courses = ["Math101", "CS101", "CS201", "CS301"]
    prereqs = [
        ("Math101", "CS101"),
        ("CS101", "CS201"),
        ("CS201", "CS301"),
    ]
    print("Course order:", topological_sort(courses, prereqs))
    # Output: ['Math101', 'CS101', 'CS201', 'CS301']

    # Cycle detection example
    try:
        topological_sort(["X", "Y"], [("X", "Y"), ("Y", "X")])
    except ValueError as e:
        print(f"Caught: {e}")
