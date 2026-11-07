public class code {
    // Repeated doubling and halving replace multiplication.
    static long multiply(long a, long b) {
        if (a < 0 || b < 0) {
            throw new IllegalArgumentException("Use nonnegative inputs");
        }
        long answer = 0;
        while (b > 0) {
            if ((b & 1) == 1) answer += a;
            a <<= 1;
            b >>= 1;
        }
        return answer;
    }

    public static void main(String[] args) {
        System.out.println("47 x 42 = " + multiply(47, 42));
        // Cross-check small inputs against Java's built-in multiplication.
        int checked = 0;
        for (long a = 0; a <= 200; a++) {
            for (long b = 0; b <= 200; b++) {
                if (multiply(a, b) != a * b) {
                    throw new AssertionError("Mismatch for " + a + ", " + b);
                }
                checked++;
            }
        }
        System.out.println("Verified " + checked + " pairs");
    }
}
