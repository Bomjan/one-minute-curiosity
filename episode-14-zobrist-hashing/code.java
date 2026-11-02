import java.util.Random;

public class code {
    private static final int SQUARES = 16; // A tiny 4x4 board
    private static final long[][] KEYS = new long[SQUARES][3];

    static {
        Random random = new Random(6174); // Same keys every run
        for (int square = 0; square < SQUARES; square++) {
            for (int piece = 0; piece < 3; piece++) {
                KEYS[square][piece] = random.nextLong();
            }
        }
    }

    private static int type(char piece) {
        return switch (piece) {
            case 'K' -> 0; // King
            case 'R' -> 1; // Rook
            case 'P' -> 2; // Pawn
            case '.' -> -1; // Empty square
            default -> throw new IllegalArgumentException("Unknown piece: " + piece);
        };
    }

    private static long fingerprint(char[] board) {
        long hash = 0;
        for (int square = 0; square < board.length; square++) {
            int piece = type(board[square]);
            if (piece != -1) hash ^= KEYS[square][piece];
        }
        return hash;
    }

    // Update the fingerprint without scanning the board again.
    private static long place(char[] board, long hash, int square, char newPiece) {
        int oldType = type(board[square]);
        int newType = type(newPiece);
        if (oldType != -1) hash ^= KEYS[square][oldType];
        board[square] = newPiece;
        if (newType != -1) hash ^= KEYS[square][newType];
        return hash;
    }

    public static void main(String[] args) {
        char[] board = "K..R......P.....".toCharArray();
        long original = fingerprint(board);

        // Move the rook from square 3 to square 7.
        long updated = place(board, original, 3, '.');
        updated = place(board, updated, 7, 'R');
        System.out.println("Updated hash matches full scan: " + (updated == fingerprint(board)));

        // Undo the move: XOR removes and restores the same keys.
        updated = place(board, updated, 7, '.');
        updated = place(board, updated, 3, 'R');
        System.out.println("Undo restores original hash: " + (updated == original));

        // Check every square and each possible replacement, including empty.
        char[] choices = {'.', 'K', 'R', 'P'};
        int checks = 0;
        for (int square = 0; square < SQUARES; square++) {
            for (char choice : choices) {
                char previous = board[square];
                long changed = place(board, original, square, choice);
                if (changed != fingerprint(board)) throw new AssertionError("Mismatch at " + square);
                long restored = place(board, changed, square, previous);
                if (restored != original) throw new AssertionError("Undo mismatch at " + square);
                checks++;
            }
        }
        System.out.println("Replacement and undo checks passed: " + checks);
    }
}
