function buildOrder(tasks, deps) {
    // deps: [a, b] pairs meaning "a must finish before b"
    const after = new Map(tasks.map(t => [t, []]));
    const waiting = new Map(tasks.map(t => [t, 0]));
    for (const [a, b] of deps) {
        after.get(a).push(b);
        waiting.set(b, waiting.get(b) + 1);
    }

    const ready = tasks.filter(t => waiting.get(t) === 0);
    const order = [];
    for (let i = 0; i < ready.length; i++) { // index walk = queue without shift()
        const task = ready[i];
        order.push(task);
        for (const next of after.get(task)) {
            waiting.set(next, waiting.get(next) - 1);
            if (waiting.get(next) === 0) ready.push(next);
        }
    }

    // Anyone left over is stuck in (or behind) a cycle
    return order.length === tasks.length ? order : null;
}

const tasks = ["lint", "compile", "test", "package", "deploy"];
const deps = [["compile", "test"], ["lint", "package"], ["test", "package"],
              ["package", "deploy"]];
console.log(buildOrder(tasks, deps));
// [ 'lint', 'compile', 'test', 'package', 'deploy' ]

console.log(buildOrder(tasks, [...deps, ["package", "test"]])); // null
