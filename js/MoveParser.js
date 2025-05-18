/**
 * MoveParser.js
 * Parses and formats Rubik's Cube moves
 */

class MoveParser {
    constructor() {
        // Define valid face notations
        this.validFaces = ['U', 'D', 'F', 'B', 'L', 'R'];
        // Define valid modifiers
        this.validModifiers = ['', "'", "2"];
    }

    /**
     * Checks if a move string is valid
     * @param {string} move - The move string to validate
     * @returns {boolean} - True if the move is valid, false otherwise
     */
    isValidMove(move) {
        if (typeof move !== 'string' || move.length === 0) {
            return false;
        }

        const face = move[0];
        const modifier = move.slice(1);

        return this.validFaces.includes(face) && this.validModifiers.includes(modifier);
    }

    /**
     * Parses an algorithm string into an array of moves
     * @param {string} algorithm - The algorithm string (e.g., "R U R' U'")
     * @returns {string[]} - An array of individual moves
     */
    parseAlgorithm(algorithm) {
        if (typeof algorithm !== 'string') {
            return [];
        }
        // Split by spaces, filter out empty strings
        return algorithm.split(' ').filter(move => move.length > 0 && this.isValidMove(move));
    }

    /**
     * Formats a move for display
     * @param {string} move - The move string
     * @returns {string} - Formatted move string (e.g., R', U²)
     */
    formatMove(move) {
        if (!this.isValidMove(move)) {
            return move; // Return as is if invalid
        }

        const face = move[0];
        const modifier = move.slice(1);

        if (modifier === "'") {
            return `${face}′`; // Use prime symbol
        } else if (modifier === "2") {
            return `${face}²`; // Use squared symbol
        } else {
            return face; // No modifier
        }
    }

    /**
     * Gets the inverse of a single move
     * @param {string} move - The move string
     * @returns {string} - The inverse move string
     */
    inverseMove(move) {
        if (!this.isValidMove(move)) {
            return move;
        }

        const face = move[0];
        const modifier = move.slice(1);

        if (modifier === "'") {
            return face; // Inverse of U' is U
        } else if (modifier === "2") {
            return move; // Inverse of U2 is U2
        } else {
            return `${face}'`; // Inverse of U is U'
        }
    }

    /**
     * Gets the inverse of an array of moves (algorithm)
     * @param {string[]} moves - An array of moves
     * @returns {string[]} - An array of inverse moves, in reverse order
     */
    inverseMoves(moves) {
        if (!Array.isArray(moves)) {
            return [];
        }
        return moves.slice().reverse().map(move => this.inverseMove(move));
    }
}