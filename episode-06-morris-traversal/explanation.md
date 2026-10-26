# Episode 06: The Tree That Needs No Stack (Morris Traversal)

**Can you walk an entire binary tree without recursion, without a stack, and without forgetting the way back?** Yes — if you temporarily turn empty pointers into breadcrumbs.

## The Curiosity

An inorder traversal visits the **left subtree**, then the **current node**, then the **right subtree**. The usual recursive solution uses the call stack to remember where to return. An explicit stack does the same job.

But what if you are allowed only **O(1) auxiliary space**, even for a tree shaped like a long chain?

## The Trick: Borrow a Pointer, Then Give It Back

For a node with a left child, find its **inorder predecessor**: the rightmost node in its left subtree.

1. If that predecessor's `right` pointer is `null`, temporarily point it back to the current node (a **thread**). Then move left.
2. When you eventually follow that thread back, recognize it because `predecessor.right == current`.
3. Remove the thread (`predecessor.right = null`), visit the current node, and move right.
4. If there is no left child, visit the node immediately and move right.

Every borrowed pointer is restored before the traversal ends.

## Walkthrough

```text
        8
      /   \
     4     12
    / \   /  \
   2   6 10  14
```

- At **8**, temporarily link **6 → 8**, then move left to 4.
- At **4**, temporarily link **2 → 4**, then move left to 2.
- Visit **2**. Its temporary link brings you back to **4**.
- Remove **2 → 4**, visit **4**, then visit **6**.
- The temporary link **6 → 8** brings you back to **8**. Remove it, visit **8**, and continue right.

The result is `2 4 6 8 10 12 14` — and the original tree is intact. Inorder traversal is sorted **because this example is a binary search tree**; Morris traversal also works on ordinary binary trees.

## Try It in Java

From the repository root:

```bash
cd episode-06-morris-traversal
javac code.java
java code
```

Expected output:

```text
Balanced BST: 2 4 6 8 10 12 14 [PASS]
Temporary links restored: true
Empty tree: (empty) [PASS]
Single node: 42 [PASS]
Left-skewed tree: 1 2 3 [PASS]
```

The source uses `public class code` so its name matches the required `code.java` filename.

## Complexity and Trade-offs

| Property | Cost |
| --- | --- |
| Time | **O(n)** — each edge is traversed only a constant number of times |
| Auxiliary space | **O(1)** — no recursion or explicit stack |
| Output storage | **O(n)** for the returned string; excluded from auxiliary space |
| Permanent tree changes | **None** after a complete traversal |

**Important:** The algorithm **temporarily mutates the tree**. Do not run it concurrently with another traversal or on a shared/immutable tree. If execution is interrupted before cleanup, temporary threads can remain. For most applications, ordinary recursive or stack-based traversal is simpler and safer.

## One-Minute Insight

> Instead of remembering the route home, Morris traversal leaves a temporary path — then erases every breadcrumb on the way back.

*Read [`code.java`](./code.java), run it, and watch how the same tree can be traversed twice without a stack.*
