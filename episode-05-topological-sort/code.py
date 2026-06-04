from collections import deque


def topological_sort(num_nodes, edges):
    graph = [[] for _ in range(num_nodes)]
    in_degree = [0] * num_nodes

    for src, dst in edges:
        graph[src].append(dst)
        in_degree[dst] += 1

    queue = deque(n for n in range(num_nodes) if in_degree[n] == 0)
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == num_nodes else None


def parallel_stages(num_nodes, edges):
    """Return nodes grouped by the earliest stage they can run in."""
    graph = [[] for _ in range(num_nodes)]
    in_degree = [0] * num_nodes

    for src, dst in edges:
        graph[src].append(dst)
        in_degree[dst] += 1

    current_wave = [n for n in range(num_nodes) if in_degree[n] == 0]
    stages = []

    while current_wave:
        stages.append(current_wave[:])
        next_wave = []
        for node in current_wave:
            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    next_wave.append(neighbor)
        current_wave = next_wave

    total = sum(len(s) for s in stages)
    return stages if total == num_nodes else None


if __name__ == "__main__":
    # 0=config, 1=logger, 2=framework, 3=router, 4=auth
    labels = ["config", "logger", "framework", "router", "auth"]
    edges = [(0, 1), (1, 2), (2, 3), (1, 3), (0, 4), (4, 3)]

    print("=== Install Order ===")
    result = topological_sort(5, edges)
    if result:
        print(" → ".join(labels[i] for i in result))
    else:
        print("Circular dependency detected!")

    print("\n=== Parallel Build Stages ===")
    stages = parallel_stages(5, edges)
    if stages:
        for i, wave in enumerate(stages):
            print(f"  Stage {i + 1}: {[labels[n] for n in wave]}")
    else:
        print("Circular dependency detected!")

    print("\n=== Cycle Detection ===")
    cycle_edges = [(0, 1), (1, 2), (2, 0)]
    cycle_labels = ["A", "B", "C"]
    result = topological_sort(3, cycle_edges)
    if result is None:
        print(f"Cycle found in graph: {[f'{cycle_labels[s]}→{cycle_labels[d]}' for s, d in cycle_edges]}")
