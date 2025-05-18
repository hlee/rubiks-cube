/**
 * app.js
 * Main application file for the 3D Rubik's Cube Simulator
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing 3D Rubik's Cube Simulator...");

    try {
        // Initialize components
        const cubeState = new CubeState();
        const moveParser = new MoveParser();
        const solver = new Solver(cubeState);

        // Flag to check if 3D visualization is available
        let visualizationAvailable = true;

        // Initialize the visual component last to ensure DOM is ready
        let cubeVisual;
        try {
            cubeVisual = new CubeVisual(cubeState, 'cube-container');
             // Force a visual update immediately after successful initialization
             cubeVisual.updateCube();
        } catch (error) {
            console.error("Error initializing 3D visualization:", error);
            visualizationAvailable = false;
            document.getElementById('cube-container').innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #e74c3c;">
                    <h2>3D Visualization Unavailable</h2>
                    <p>The 3D visualization could not be initialized (${error.message}).</p>
                    <p>You can still use the simulator via the move history and solution steps.</p>
                </div>
            `;
        }


        // DOM elements
        const moveButtons = document.querySelectorAll('button[data-move]');
        const scrambleButton = document.getElementById('scramble-btn');
        const solveButton = document.getElementById('solve-btn');
        const resetButton = document.getElementById('reset-btn');
        const moveList = document.getElementById('move-list');
        const solutionSteps = document.getElementById('solution-steps');

        // Flag to track if a solution is being visualized
        let isPlayingSolution = false;

        // Function to update the move history display
        function updateMoveHistory() {
            moveList.innerHTML = '';

            cubeState.moveHistory.forEach(move => {
                const moveSpan = document.createElement('span');
                moveSpan.className = 'move';
                moveSpan.textContent = moveParser.formatMove(move);
                moveList.appendChild(moveSpan);
            });

            // If there are no moves, show a placeholder
            if (cubeState.moveHistory.length === 0) {
                moveList.innerHTML = '<em>No moves yet</em>';
            }

            // Scroll to the bottom
            moveList.scrollTop = moveList.scrollHeight;
        }

        // Function to display the solution
        function displaySolution(solution) {
            solutionSteps.innerHTML = '';

            if (solution.length === 0) {
                solutionSteps.innerHTML = '<em>Already solved!</em>';
                return;
            }

            solution.forEach(move => {
                const moveSpan = document.createElement('span');
                moveSpan.className = 'move';
                moveSpan.textContent = moveParser.formatMove(move);
                solutionSteps.appendChild(moveSpan);
            });

            // Add move count
            const moveCount = document.createElement('div');
            moveCount.className = 'move-count';
            moveCount.textContent = `${solution.length} move${solution.length === 1 ? '' : 's'}`;
            solutionSteps.appendChild(moveCount);
        }

         // Function to toggle button enabled states
         function toggleButtons(enabled) {
             moveButtons.forEach(button => button.disabled = !enabled);
             scrambleButton.disabled = !enabled;
             solveButton.disabled = !enabled;
             resetButton.disabled = !enabled;
         }


        // Event listeners for move buttons
        moveButtons.forEach(button => {
            button.addEventListener('click', async () => {
                if (isPlayingSolution) return; // Prevent moves during solution playback

                const move = button.getAttribute('data-move');

                if (moveParser.isValidMove(move)) {
                    // Apply the move to the internal state
                    cubeState.applyMove(move);

                    // Apply the move to the visual state if available
                    if (visualizationAvailable) {
                        try {
                            await cubeVisual.rotateMove(move, true); // Animate the move
                        } catch (error) {
                             console.error("Error during move animation:", error);
                             // If animation fails, just update the visual state to match internal
                             cubeVisual.updateCube();
                        }
                    } else {
                         console.log(`Move applied (no visualization): ${move}`);
                    }

                    // Update the move history display
                    updateMoveHistory();

                    // Clear any previous solution
                    solutionSteps.innerHTML = '';
                }
            });
        });

        // Scramble button event listener
        scrambleButton.addEventListener('click', async () => {
            if (isPlayingSolution) return; // Prevent scrambling during solution playback

            // Generate a random scramble
            const scramble = cubeState.generateScramble();

            // Disable buttons during scramble
            toggleButtons(false);

            // Update UI to show scrambling in progress
            scrambleButton.textContent = 'Scrambling...';
            solutionSteps.innerHTML = '<div class="solving-progress">Scrambling the cube...</div>';


             // Apply the scramble to the visual state if available
             if (visualizationAvailable) {
                 try {
                     // Clear internal history temporarily to apply visual scramble
                     const tempHistory = [...cubeState.moveHistory];
                     cubeState.moveHistory = [];
                     await cubeVisual.applyMoves(scramble, true); // Animate the scramble
                     cubeState.moveHistory = tempHistory; // Restore history

                 } catch (error) {
                      console.error("Error during scramble animation:", error);
                      // If animation fails, just update the visual state to match internal
                      cubeVisual.updateCube();
                 }
             } else {
                  console.log("Scramble applied (no visualization):", scramble.join(" "));
             }

            // Restore button text
            scrambleButton.textContent = 'Scramble';

            // Update the move history display
            updateMoveHistory();

            // Clear any previous solution display (the scramble is the new state)
            solutionSteps.innerHTML = '';

            // Re-enable buttons
            toggleButtons(true);
        });

        // Solve button event listener
        solveButton.addEventListener('click', async () => {
            if (isPlayingSolution) return; // Prevent solving during solution playback

            if (solver.isSolved()) {
                alert('The cube is already solved!');
                return;
            }

            // Disable buttons during solving
            toggleButtons(false);

            try {
                // Show solving in progress
                solveButton.textContent = 'Analyzing...';
                solutionSteps.innerHTML = '<div class="solving-progress">Analyzing cube state...</div>';

                // Short delay for visual feedback
                await new Promise(resolve => setTimeout(resolve, 500));

                // Get the solution with progress updates
                const solution = await solver.solve((progress) => {
                    // Update the UI with solving progress
                    solveButton.textContent = `Solving (${Math.round(progress.progress * 100)}%)`;

                    // Update the solution steps with progress details
                    if (progress.message) {
                        solutionSteps.innerHTML = `<div class="solving-progress">${progress.message}</div>`;
                    }
                });

                // Display the solution
                displaySolution(solution);

                // Flag to indicate we're playing the solution
                isPlayingSolution = true;

                 // Apply the solution moves to the visual state if available
                 if (visualizationAvailable) {
                     try {
                         await cubeVisual.applyMoves(solution, true); // Animate the solution
                     } catch (error) {
                          console.error("Error during solution animation:", error);
                          // If animation fails, apply moves directly to the internal state
                          // and update the visual state to match
                          for (const move of solution) {
                              cubeState.applyMove(move); // These moves were already applied internally by solver.solve
                          }
                          cubeVisual.updateCube();
                     }
                 } else {
                      console.log("Solution applied (no visualization):", solution.join(" "));
                      // Update internal state if not already done by solver.solve (double-check logic)
                      // Based on current Solver.js, it applies moves internally.
                 }


                // The cube should now be solved internally
                console.log("Solution applied, internal cube state solved:", cubeState.isSolved());

                // Note: Visual state may not match internal state if visualization failed or animation had issues.
                // We added basic error handling for animation failures, which should update the visual to match.
                // If visualization isn't available, the internal state is the source of truth.

                // Update move history with the solution moves
                cubeState.moveHistory = [...cubeState.moveHistory, ...solution];
                updateMoveHistory();


                // Restore solve button text
                solveButton.textContent = 'Solve';

                // End solution playback
                isPlayingSolution = false;
            } catch (error) {
                console.error('Solving error:', error);
                alert(`Error solving cube: ${error.message}`);
                solveButton.textContent = 'Solve';
            }

            // Re-enable buttons
            toggleButtons(true);
        });

        // Reset button event listener
        resetButton.addEventListener('click', async () => {
            if (isPlayingSolution) return; // Prevent reset during solution playback

            // Disable buttons during reset
            toggleButtons(false);

            // Reset the cube state and visual
            resetButton.textContent = 'Resetting...';

            if (visualizationAvailable) {
                try {
                    await cubeVisual.reset(true); // Animate the reset
                } catch (error) {
                     console.error("Error during reset animation:", error);
                     // If animation fails, just reset internal state and update visual
                     cubeState.reset();
                     cubeVisual.updateCube();
                }
            } else {
                 cubeState.reset();
                 console.log("Cube reset (no visualization)");
            }

            resetButton.textContent = 'Reset';

            // Clear the move history
            updateMoveHistory();

            // Clear any solution
            solutionSteps.innerHTML = '';

            // Re-enable buttons
            toggleButtons(true);
        });


        // Make move history spans clickable to apply that move
        moveList.addEventListener('click', async (event) => {
             if (isPlayingSolution) return;

             const moveSpan = event.target.closest('.move');
             if (moveSpan) {
                 const move = moveSpan.textContent.replace('′', "'").replace('²', '2'); // Convert back to standard notation
                 if (moveParser.isValidMove(move)) {
                      // Apply the move to the internal state
                     cubeState.applyMove(move);

                      // Apply the move to the visual state if available
                     if (visualizationAvailable) {
                         try {
                             await cubeVisual.rotateMove(move, true); // Animate the move
                         } catch (error) {
                              console.error("Error during move animation:", error);
                              // If animation fails, just update the visual state to match internal
                              cubeVisual.updateCube();
                         }
                     } else {
                          console.log(`Move applied (no visualization): ${move}`);
                     }

                     // Update the move history display (this will re-render the list including the new move)
                     updateMoveHistory();

                     // Clear any previous solution
                     solutionSteps.innerHTML = '';
                 }
             }
        });


        // Make solution steps spans clickable to apply that move
        solutionSteps.addEventListener('click', async (event) => {
            if (isPlayingSolution) return;

            const moveSpan = event.target.closest('.move');
            if (moveSpan) {
                const move = moveSpan.textContent.replace('′', "'").replace('²', '2'); // Convert back to standard notation
                if (moveParser.isValidMove(move)) {
                    // Apply the move to the internal state
                    cubeState.applyMove(move);

                    // Apply the move to the visual state if available
                    if (visualizationAvailable) {
                        try {
                            await cubeVisual.rotateMove(move, true); // Animate the move
                        } catch (error) {
                             console.error("Error during move animation:", error);
                             // If animation fails, just update the visual state to match internal
                             cubeVisual.updateCube();
                        }
                    } else {
                         console.log(`Move applied (no visualization): ${move}`);
                    }

                    // Update the move history display
                    updateMoveHistory();

                    // Clear any previous solution (since we're applying a step from it)
                    // Consider how you want this to behave - applying a step might affect the remaining solution display
                    // For simplicity here, we'll clear it.
                    solutionSteps.innerHTML = '';
                }
            }
        });

        // Keyboard shortcuts for moves
        document.addEventListener('keydown', async (event) => {
            if (isPlayingSolution) return; // Prevent moves during solution playback

            const key = event.key.toUpperCase();

            // Map keys to moves
            const keyMoves = {
                'U': 'U',
                'D': 'D',
                'F': 'F',
                'B': 'B',
                'L': 'L',
                'R': 'R'
            };

            const move = keyMoves[key];
            if (move) {
                // If key pressed with Shift, add the "prime" modifier (counterclockwise)
                const fullMove = event.shiftKey ? `${move}'` : move;

                // Apply the move to the internal state
                cubeState.applyMove(fullMove);

                 // Apply the move to the visual state if available
                if (visualizationAvailable) {
                    try {
                        await cubeVisual.rotateMove(fullMove, true); // Animate the move
                    } catch (error) {
                         console.error("Error during move animation:", error);
                         // If animation fails, just update the visual state to match internal
                         cubeVisual.updateCube();
                    }
                } else {
                     console.log(`Move applied (no visualization): ${fullMove}`);
                }

                // Update the move history display
                updateMoveHistory();

                // Clear any previous solution
                solutionSteps.innerHTML = '';
            }
        });


        // Initialize the move history display
        updateMoveHistory();

        // Output keyboard instructions to console
        console.log("3D Rubik's Cube Simulator initialized");
        console.log("Keyboard shortcuts: U, D, F, B, L, R keys for clockwise moves");
        console.log("Hold Shift + key for counterclockwise moves (e.g., Shift+U for U')");

        // Test the solver once at startup to ensure it's working
        solver.testSolver().then(success => {
            if (success) {
                console.log("Solver test successful - CubeJS integration working properly");
            } else {
                console.warn("Solver test failed - there may be issues with the CubeJS integration");
            }
        }).catch(error => {
            console.error("Error testing solver:", error);
        });

    } catch (error) {
        console.error("Error initializing application:", error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e74c3c;">
                <h1>Error Initializing Rubik's Cube Simulator</h1>
                <p>Please check the console for details.</p>
                <p>${error.message}</p>
                <button onclick="location.reload()">Reload Page</button>
            </div>
        `;
    }
});