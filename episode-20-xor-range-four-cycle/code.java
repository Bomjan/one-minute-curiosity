public class code {
    // XOR of all integers from 0 through n, inclusive.
    static int prefixXor(int n) {
        if (n < 0) throw new IllegalArgumentException("n must be nonnegative");
        return switch (n & 3) {
            case 0 -> n;
            case 1 -> 1;
            case 2 -> n + 1;
            default -> 0;
        };
    }

    // XOR of all integers from left through right, inclusive.
    static int rangeXor(int left, int right) {
        if (left < 0 || right < left)
            throw new IllegalArgumentException("Require 0 <= left <= right");
        return prefixXor(right) ^ (left == 0 ? 0 : prefixXor(left - 1));
    }

    public static void main(String[] args) {
        System.out.println("XOR of 5..12 = " + rangeXor(5, 12));
        int running = 0;
        for (int n = 0; n <= 10000; n++) {
            running ^= n;
            if (prefixXor(n) != running)
                throw new AssertionError("Prefix mismatch at " + n);
        }
        for (int left = 0; left <= 100; left++) {
            int expected = 0;
            for (int right = left; right <= 100; right++) {
                expected ^= right;
                if (rangeXor(left, right) != expected)
                    throw new AssertionError("Range mismatch: " + left + ".." + right);
            }
        }
        System.out.println("Verified 10,001 prefixes and 5,151 ranges");
    }
}
