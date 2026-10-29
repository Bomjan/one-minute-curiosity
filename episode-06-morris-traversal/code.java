// Episode 06: Morris Inorder Traversal
// Visit a binary tree in sorted order (for a BST) without recursion or a stack.
// The temporary links are removed before the traversal finishes.

public class code {
    static class Node {
        int value;
        Node left, right;

        Node(int value) {
            this.value = value;
        }
    }

    static String morrisInorder(Node root) {
        StringBuilder result = new StringBuilder();
        Node current = root;

        while (current != null) {
            if (current.left == null) {
                append(result, current.value);
                current = current.right;
            } else {
                // Find the rightmost node of the current left subtree.
                Node predecessor = current.left;
                while (predecessor.right != null && predecessor.right != current) {
                    predecessor = predecessor.right;
                }

                if (predecessor.right == null) {
                    // Thread back here after visiting the left subtree.
                    predecessor.right = current;
                    current = current.left;
                } else {
                    // We returned via the thread: remove it before visiting.
                    predecessor.right = null;
                    append(result, current.value);
                    current = current.right;
                }
            }
        }
        return result.toString();
    }

    private static void append(StringBuilder result, int value) {
        if (result.length() > 0) result.append(' ');
        result.append(value);
    }

    private static void check(String label, String expected, Node root) {
        String first = morrisInorder(root);
        String second = morrisInorder(root); // Traversing twice checks that threads were removed.
        if (!expected.equals(first) || !expected.equals(second)) {
            throw new AssertionError(label + ": expected " + expected + ", got " + first + " / " + second);
        }
        System.out.println(label + ": " + (first.isEmpty() ? "(empty)" : first) + " [PASS]");
    }

    public static void main(String[] args) {
        //           8
        //         /   \
        //        4     12
        //       / \   /  \
        //      2   6 10  14
        Node root = new Node(8);
        root.left = new Node(4);
        root.right = new Node(12);
        root.left.left = new Node(2);
        root.left.right = new Node(6);
        root.right.left = new Node(10);
        root.right.right = new Node(14);

        check("Balanced BST", "2 4 6 8 10 12 14", root);
        if (root.left.right.right != null || root.left.left.right != null
                || root.right.left.right != null) {
            throw new AssertionError("Morris traversal did not restore the original links");
        }
        System.out.println("Temporary links restored: true");

        check("Empty tree", "", null);
        check("Single node", "42", new Node(42));

        Node skewed = new Node(3);
        skewed.left = new Node(2);
        skewed.left.left = new Node(1);
        check("Left-skewed tree", "1 2 3", skewed);
    }
}
