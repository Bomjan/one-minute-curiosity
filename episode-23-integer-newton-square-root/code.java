public class code {
    // Newton's method finds the floor of the square root without floating point.
    static long isqrt(long n) {
        if (n < 0) throw new IllegalArgumentException("n must be nonnegative");
        if (n < 2) return n;
        long x = n;
        while (true) {
            long next = x - (x - n / x + 1) / 2;
            if (next >= x) return x;
            x = next;
        }
    }

    public static void main(String[] args) {
        long n = 1_000_000_000_000L;
        System.out.println("sqrt floor of " + n + " = " + isqrt(n));
        for (long i = 0; i <= 100_000; i++) {
            long r = isqrt(i);
            if (r > i / Math.max(r, 1) || (r + 1) <= i / (r + 1)) {
                throw new AssertionError("Incorrect result for " + i);
            }
        }
        long maxRoot = isqrt(Long.MAX_VALUE);
        if (maxRoot != 3_037_000_499L) throw new AssertionError("Long.MAX_VALUE failed");
        System.out.println("Verified 100,001 integers and Long.MAX_VALUE");
    }
}
