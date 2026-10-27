import java.util.ArrayDeque;
import java.util.Queue;

// Episode 08: Josephus Problem (remove every second person).
// A bit trick replaces a full simulation when the step size is exactly two.
public class code {
    static int survivor(int n) {
        if (n < 1) throw new IllegalArgumentException("n must be positive");
        int highestPowerOfTwo = Integer.highestOneBit(n);
        return 2 * (n - highestPowerOfTwo) + 1;
    }

    // Independent reference: the zero-based survivor for n people is
    // (previous survivor + 2) mod n.
    static int survivorByRecurrence(int n) {
        if (n < 1) throw new IllegalArgumentException("n must be positive");
        int index = 0;
        for (int size = 2; size <= n; size++) {
            index = (index + 2) % size;
        }
        return index + 1;
    }

    static String eliminationOrder(int n) {
        Queue<Integer> circle = new ArrayDeque<>();
        for (int person = 1; person <= n; person++) circle.add(person);

        StringBuilder order = new StringBuilder();
        while (!circle.isEmpty()) {
            circle.add(circle.remove()); // The first person is spared.
            int removed = circle.remove(); // The second person leaves.
            if (order.length() > 0) order.append(" -> ");
            order.append(removed);
        }
        return order.toString();
    }

    public static void main(String[] args) {
        for (int n = 1; n <= 2048; n++) {
            if (survivor(n) != survivorByRecurrence(n)) {
                throw new AssertionError("Mismatch for n=" + n);
            }
        }
        if (survivor(7) != 7 || survivor(10) != 5
                || survivor(13) != 11 || survivor(41) != 19
                || survivor(Integer.MAX_VALUE) != Integer.MAX_VALUE) {
            throw new AssertionError("Known cases failed");
        }
        if (!eliminationOrder(7).equals("2 -> 4 -> 6 -> 1 -> 5 -> 3 -> 7")) {
            throw new AssertionError("Elimination order was incorrect");
        }

        System.out.println("Seven-person elimination: " + eliminationOrder(7));
        for (int n : new int[] {7, 10, 13, 41}) {
            System.out.println("n=" + n + ", survivor=" + survivor(n));
        }
        System.out.println("PASS: 2,048 cross-checks and known cases");
    }
}
