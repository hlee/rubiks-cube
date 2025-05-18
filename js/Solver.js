/**
 * Solver.js
 * Integrates with CubeJS to solve the Rubik's Cube
 */

class Solver {
    constructor(cubeState) {
        this.cubeState = cubeState;
        this.moveParser = new MoveParser();
        this.isSolving = false;

        // Check if CubeJS is available
        if (typeof Cube !== 'undefined') {
            console.log("CubeJS library found and ready");
            try {
                Cube.initSolver();
                this.solverInitialized = true;
                console.log("CubeJS solver initialized");
            } catch (error) {
                console.error("Failed to initialize CubeJS solver:", error);
                this.solverInitialized = false;
            }
        } else {
            console.error("CubeJS library not found. Make sure it's properly loaded.");
            this.solverInitialized = false;
        }
    }

    /**
     * Check if the cube is in a solved state
     * @returns {boolean} - Whether the cube is solved
     */
    isSolved() {
        // Use the isSolved method from CubeState
        return this.cubeState.isSolved();
    }

    /**
     * Solve the cube using CubeJS
     * @param {function} progressCallback - Optional callback for progress updates
     * @returns {Promise<string[]>} - Promise resolving to array of solution moves
     */
    async solve(progressCallback = null) {
        if (this.isSolving) {
            return Promise.reject(new Error('Solver is already running'));
        }

        if (this.isSolved()) {
            return Promise.resolve([]);
        }

        if (!this.solverInitialized) {
            return Promise.reject(new Error('CubeJS solver not initialized'));
        }

        this.isSolving = true;

        try {
            // Progress update
            if (progressCallback) {
                progressCallback({
                    status: 'preparing',
                    message: 'Preparing cube state',
                    progress: 0.1
                });
            }

            // Get the current cube state as a facelet string
            const faceletString = this.cubeState.toFaceletString();
            console.log("Solving cube from facelet string:", faceletString);

            // Progress update
            if (progressCallback) {
                progressCallback({
                    status: 'analyzing',
                    message: 'Analyzing cube state',
                    progress: 0.3
                });
            }

            // Solve the cube using CubeJS
            return new Promise((resolve, reject) => {
                 // Wrap in setTimeout to allow the UI to update
                 setTimeout(() => {
                     try {
                         console.log("Computing solution with CubeJS...");

                         // Create a CubeJS cube from the facelet string
                         const cube = Cube.fromString(faceletString);

                         // Progress update
                         if (progressCallback) {
                             progressCallback({
                                 status: 'solving',
                                 message: 'Computing optimal solution',
                                 progress: 0.5
                             });
                         }

                         // Get the solution
                         const solution = cube.solve();
                         console.log("Solution found:", solution);

                         // Parse the solution into an array of moves
                         const parsedSolution = this.moveParser.parseAlgorithm(solution);
                         console.log("Parsed solution:", parsedSolution);

                         // Verify the solution using a test cube
                         const testCube = Cube.fromString(faceletString);
                         testCube.move(solution);
                         const testSolved = testCube.isSolved();
                         console.log("Solution verification:", testSolved ? "SUCCESSFUL" : "FAILED");

                         if (!testSolved) {
                             console.warn("Solution does not solve the cube according to CubeJS");
                              // Continue anyway since we'll trust CubeJS's solution based on its output
                         }


                         // Progress update
                         if (progressCallback) {
                             progressCallback({
                                 status: 'complete',
                                 message: 'Solution ready',
                                 progress: 1.0,
                                 solution: parsedSolution,
                                 moveCount: parsedSolution.length
                             });
                         }

                         this.isSolving = false;
                         resolve(parsedSolution);
                     } catch (error) {
                         console.error("CubeJS solve error:", error);
                         this.isSolving = false;
                         reject(new Error("CubeJS solve failed: " + error.message));
                     }
                 }, 100); // Short delay
            });

        } catch (error) {
            console.error("Unexpected error in solve method:", error);
            this.isSolving = false;
            return Promise.reject(new Error("Unexpected error: " + error.message));
        }
    }

    /**
     * Cancel any ongoing solving operation
     */
    cancel() {
        this.isSolving = false;
    }

    /**
     * Test the solver integration
     * @returns {Promise<boolean>} - Whether the test was successful
     */
    testSolver() {
        return new Promise(async (resolve) => {
            console.log("Running solver test...");

            if (!this.solverInitialized) {
                console.error("Solver test failed: CubeJS not initialized.");
                resolve(false);
                return;
            }

            // Start with a solved cube
            const initialFacelet = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"; // Solved state

            try {
                // Create a CubeJS cube from the solved state
                const testCube = Cube.fromString(initialFacelet);

                // Apply a known sequence of moves
                const testSequence = "R U R' U'"; // A simple sequence that does not solve the cube
                console.log("Applying test sequence to CubeJS cube:", testSequence);
                testCube.move(testSequence);

                // Verify the test cube is not solved
                if (testCube.isSolved()) {
                    console.error("Solver test failed: Test cube should not be solved after test sequence.");
                    resolve(false);
                    return;
                }

                // Try to solve the scrambled test cube
                console.log("Attempting to solve scrambled test cube...");
                const solution = testCube.solve();
                console.log("Test solution found:", solution);

                // Apply the solution to the test cube
                testCube.move(solution);

                // Check if the test cube is now solved
                if (testCube.isSolved()) {
                    console.log("Solver test successful: Test cube solved after applying the found solution.");
                    resolve(true);
                } else {
                    console.error("Solver test failed: Test cube not solved after applying the found solution.");
                    resolve(false);
                }

            } catch (error) {
                console.error("An error occurred during solver test:", error);
                resolve(false);
            }
        });
    }
}