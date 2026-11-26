public class code {
    static int survivors(int n) {
        int count = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            // A valid subset has no two neighboring positions selected.
            if ((mask & (mask >> 1)) == 0) count++;
        }
        return count;
    }

    public static void main(String[] args) {
        int a = 1, b = 2;
        for (int n = 0; n <= 20; n++) {
            int actual = survivors(n);
            if (actual != a) throw new AssertionError(n);
            if (n == 20) System.out.println(actual + " valid subsets");
            int next = a + b;
            a = b;
            b = next;
        }
    }
}
