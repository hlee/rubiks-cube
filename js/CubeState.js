/**
 * CubeState.js
 * Manages the internal representation of the Rubik's Cube state
 */

class CubeState {
    constructor() {
        // Event handler for state changes (to be set by the app)
        this.onStateChange = () => {};

        // Initialize the cube with the solved state
        this.reset();

        // Define face names and colors for reference
        this.faceNames = ['U', 'D', 'F', 'B', 'L', 'R'];
        this.faceColors = ['white', 'yellow', 'green', 'blue', 'orange', 'red'];
    }

    /**
     * Reset the cube to the solved state
     */
    reset() {
        // Create a 6x3x3 array to represent the cube (one 3x3 for each face)
        // U (Up/Top) = 0, D (Down/Bottom) = 1, F (Front) = 2, B (Back) = 3, L (Left) = 4, R (Right) = 5
        this.state = Array(6).fill().map((_, faceIndex) => {
            return Array(3).fill().map(() => Array(3).fill(faceIndex));
        });

        // Clear the move history
        this.moveHistory = [];

        // Fire event to notify listeners that the state has changed
        this.onStateChange();
    }

    /**
     * Get the color of a specific sticker
     * @param {number} face - Face index (0-5)
     * @param {number} row - Row index (0-2)
     * @param {number} col - Column index (0-2)
     * @returns {number} - Color index
     */
    getColor(face, row, col) {
        return this.state[face][row][col];
    }

    /**
     * Convert the internal state to a format expected by cubejs
     * This function maps our internal representation to the string format
     * expected by the cubejs library
     * @returns {string} - 54-character string representing the cube state
     */
    toFaceletString() {
        // In cubejs, the 54-character string represents the cube's colors in the order:
        // U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
        // where each face is read from left to right, top to bottom

        let result = '';

        // Helper function to map our state to cubejs face letters
        const colorToFacelet = (colorIndex) => {
            return this.faceNames[colorIndex];
        };

        try {
            // U face (top) - index 0
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result += colorToFacelet(this.state[0][row][col]);
                }
            }

            // R face (right) - index 5
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result += colorToFacelet(this.state[5][row][col]);
                }
            }

            // F face (front) - index 2
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result += colorToFacelet(this.state[2][row][col]);
                }
            }

            // D face (bottom) - index 1
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result += colorToFacelet(this.state[1][row][col]);
                }
            }

            // L face (left) - index 4
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result += colorToFacelet(this.state[4][row][col]);
                }
            }

            // B face (back) - index 3
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result += colorToFacelet(this.state[3][row][col]);
                }
            }
        } catch (error) {
            console.error("Error generating facelet string:", error);
        }

        // Verify that the string is 54 characters long
        if (result.length !== 54) {
            console.error(`Invalid facelet string length: ${result.length}, expected 54`);
        }

        return result;
    }

    /**
     * Update the internal state based on a facelet string
     * @param {string} faceletString - 54-character string representing the cube state
     */
    fromFaceletString(faceletString) {
         if (typeof faceletString !== 'string' || faceletString.length !== 54) {
             console.error("Invalid facelet string provided:", faceletString);
             return;
         }

         // Map facelet characters to color indices
         const faceletToColor = (char) => {
             const index = this.faceNames.indexOf(char);
             return index !== -1 ? index : -1; // Return -1 for invalid characters
         };

         let charIndex = 0;
         try {
             // U face (top) - index 0
             for (let row = 0; row < 3; row++) {
                 for (let col = 0; col < 3; col++) {
                     this.state[0][row][col] = faceletToColor(faceletString[charIndex++]);
                 }
             }

             // R face (right) - index 5
             for (let row = 0; row < 3; row++) {
                 for (let col = 0; col < 3; col++) {
                     this.state[5][row][col] = faceletToColor(faceletString[charIndex++]);
                 }
             }

             // F face (front) - index 2
             for (let row = 0; row < 3; row++) {
                 for (let col = 0; col < 3; col++) {
                     this.state[2][row][col] = faceletToColor(faceletString[charIndex++]);
                 }
             }

             // D face (bottom) - index 1
             for (let row = 0; row < 3; row++) {
                 for (let col = 0; col < 3; col++) {
                     this.state[1][row][col] = faceletToColor(faceletString[charIndex++]);
                 }
             }

             // L face (left) - index 4
             for (let row = 0; row < 3; row++) {
                 for (let col = 0; col < 3; col++) {
                     this.state[4][row][col] = faceletToColor(faceletString[charIndex++]);
                 }
             }

             // B face (back) - index 3
             for (let row = 0; row < 3; row++) {
                 for (let col = 0; col < 3; col++) {
                     this.state[3][row][col] = faceletToColor(faceletString[charIndex++]);
                 }
             }
         } catch (error) {
             console.error("Error parsing facelet string:", error);
             this.reset(); // Reset to a valid state on error
         }
         
         // Fire event to notify listeners that the state has changed
         this.onStateChange();
    }


    /**
     * Check if the cube is in a solved state
     * @returns {boolean} - true if solved, false otherwise
     */
    isSolved() {
        // Check each face - all stickers on a face should be the same color
        for (let face = 0; face < 6; face++) {
            const faceColor = this.state[face][0][0];

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    if (this.state[face][row][col] !== faceColor) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Applies a move to the cube (updates internal state)
     * Note: This is a simplified implementation for internal state tracking.
     * A full 3D cube state update requires more complex logic.
     * @param {string} move - The move in standard notation (e.g., "U", "R'", "F2")
     */
    applyMove(move) {
        // Use CubeJS to apply the move and update the internal state

        const moveParser = new MoveParser();
        if (!moveParser.isValidMove(move)) {
            console.warn(`Attempted to apply invalid move: ${move}`);
            return;
        }

        try {
            // Get the current state as a facelet string
            const currentFacelet = this.toFaceletString();

            // Create a temporary CubeJS cube and apply the move
            const tempCube = Cube.fromString(currentFacelet);
            tempCube.move(move);

            // Get the new state as a facelet string
            const newFacelet = tempCube.asString(); // Use asString() for facelet string

            // Update the internal state based on the new facelet string
            this.fromFaceletString(newFacelet);

            // Add move to history
            this.moveHistory.push(move);
            console.log(`Applied move: ${move}. New state: ${newFacelet}`);

        } catch (error) {
            console.error(`Error applying move "${move}" with CubeJS:`, error);
            // Optionally, reset the cube or handle the error differently
            // this.reset();
        }

        // Fire event to notify listeners that the state has changed
        this.onStateChange();
    }

    /**
     * Applies a sequence of moves
     * @param {string[]} moves - An array of moves
     */
    applyMoves(moves) {
        if (!Array.isArray(moves)) {
            console.error("Invalid moves array provided:", moves);
            return;
        }
        for (const move of moves) {
            this.applyMove(move);
        }
    }

    /**
     * Generates a random scramble sequence
     * Note: This is a basic scramble generation. For a standard competition
     * scramble, more advanced algorithms are needed.
     * @param {number} length - The number of moves in the scramble
     * @returns {string[]} - An array of scramble moves
     */
    generateScramble(length = 20) {
        const moves = ['U', 'D', 'F', 'B', 'L', 'R'];
        const modifiers = ['', "'", "2"];
        const scramble = [];
        let lastMove = '';

        for (let i = 0; i < length; i++) {
            let randomFace = moves[Math.floor(Math.random() * moves.length)];
            // Prevent consecutive moves on the same face
            while (lastMove && randomFace === lastMove[0]) {
                 randomFace = moves[Math.floor(Math.random() * moves.length)];
            }
            const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            const move = randomFace + randomModifier;
            scramble.push(move);
            lastMove = move;
        }
        
        // Apply the scramble to the internal state
        this.applyMoves(scramble);
        this.moveHistory = scramble; // Replace history with the scramble sequence
        console.log("Generated and applied scramble:", scramble.join(" "));

        return scramble;
    }
}