// Episode 09: Gosper's Hack — jump to the next bitmask with the same number of 1s.
// Run: javac code.java && java code
public class code {
    // Requires a positive mask. The demo uses at most 30 bits to avoid signed overflow.
    static int nextMask(int mask) {
        int lowestOne = mask & -mask;
        int ripple = mask + lowestOne;
        return ripple | (((ripple ^ mask) >>> 2) / lowestOne);
    }

    static int showCombinations(int width, int chosen) {
        if (width < 1 || width > 30 || chosen < 1 || chosen > width) {
            throw new IllegalArgumentException("Require 1 <= chosen <= width <= 30");
        }

        int limit = 1 << width;
        int mask = (1 << chosen) - 1;
        int count = 0;
        while (mask < limit) {
            if (count < 8) {
                String bits = Integer.toBinaryString(mask);
                System.out.println("0".repeat(width - bits.length()) + bits);
            }
            count++;
            mask = nextMask(mask);
        }
        return count;
    }

    // Compare the bit trick with exhaustive enumeration for every small width and k.
    static void verify() {
        int cases = 0;
        int combinations = 0;
        for (int width = 1; width <= 12; width++) {
            int limit = 1 << width;
            for (int chosen = 1; chosen <= width; chosen++) {
                int mask = (1 << chosen) - 1;
                for (int candidate = 1; candidate < limit; candidate++) {
                    if (Integer.bitCount(candidate) == chosen) {
                        if (mask != candidate) {
                            throw new AssertionError("Mismatch: width=" + width
                                    + ", chosen=" + chosen + ", expected=" + candidate
                                    + ", actual=" + mask);
                        }
                        mask = nextMask(mask);
                        combinations++;
                    }
                }
                if (mask < limit) {
                    throw new AssertionError("Generated extra mask");
                }
                cases++;
            }
        }
        System.out.println("Verified " + cases + " (width, chosen) cases and "
                + combinations + " combinations against brute force.");
    }

    public static void main(String[] args) {
        System.out.println("Choose 3 positions from 8 (first 8 masks):");
        int count = showCombinations(8, 3);
        System.out.println("Generated " + count + " masks instead of checking all 256.");
        if (count != 56) {
            throw new AssertionError("8 choose 3 must equal 56");
        }
        verify();
    }
}
