public class code {
    // Reflecting a binary number across itself changes the counting order.
    static int gray(int n) {
        return n ^ (n >>> 1);
    }

    public static void main(String[] args) {
        int bits = 4;
        int previous = -1;
        boolean[] seen = new boolean[1 << bits];

        for (int n = 0; n < (1 << bits); n++) {
            int value = gray(n);
            if (seen[value]) throw new AssertionError("Repeated code");
            seen[value] = true;
            if (previous >= 0 && Integer.bitCount(previous ^ value) != 1) {
                throw new AssertionError("More than one bit changed");
            }
            System.out.printf("%2d -> %4s%n", n,
                String.format("%4s", Integer.toBinaryString(value)).replace(' ', '0'));
            previous = value;
        }
        // The last and first values also differ by exactly one bit.
        if (Integer.bitCount(previous ^ gray(0)) != 1) {
            throw new AssertionError("Cycle does not close");
        }
        System.out.println("Verified: 16 unique codes; one bit changes per step, including wraparound.");
    }
}
