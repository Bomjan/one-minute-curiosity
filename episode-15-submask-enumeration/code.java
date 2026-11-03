public class code {
    // Visit every subset of a bitmask, including the empty subset.
    static int countSubmasks(int mask) {
        int count = 0;
        int sub = mask;
        do {
            if ((sub & mask) != sub) throw new AssertionError("Invalid subset");
            count++;
            sub = (sub - 1) & mask;
        } while (sub != mask);
        return count;
    }

    public static void main(String[] args) {
        int mask = 0b10110;
        System.out.println("Submasks of 10110:");
        int sub = mask;
        do {
            System.out.printf("%5s%n", String.format("%5s", Integer.toBinaryString(sub)).replace(' ', '0'));
            sub = (sub - 1) & mask;
        } while (sub != mask);

        int total = 0;
        int bits = 10;
        for (int m = 0; m < (1 << bits); m++) {
            int expected = 1 << Integer.bitCount(m);
            int actual = countSubmasks(m);
            if (actual != expected) throw new AssertionError("Mask " + m);
            total += actual;
        }
        int expectedTotal = 1;
        for (int i = 0; i < bits; i++) expectedTotal *= 3;
        if (total != expectedTotal) throw new AssertionError("Total mismatch");
        System.out.println("Verified " + (1 << bits) + " masks and " + total + " (mask, submask) pairs = 3^" + bits);
    }
}
