# 3D Rubik's Cube Simulator

A web-based Rubik's Cube simulator with 3D visualization using Three.js and a solver integrated with the CubeJS library.

## How to Use

To set up and run the simulator locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hlee/rubiks-cube.git
    ```
    Navigate into the project directory:
    ```bash
    cd rubiks-cube/rubiks-cube-simulator-new
    ```

2.  **Serve the application:**
    You can use a simple HTTP server like Python's `http.server`. Make sure you are in the `rubiks-cube-simulator-new` directory.
    ```bash
    python3 -m http.server 8002
    ```
    This will start a web server on port 8002.

3.  **Open in browser:**
    Open your web browser and go to `http://localhost:8002/index.html`.

## Interaction

-   **Mouse:**
    - Orbit: Left mouse button click and drag.
    - Zoom: Mouse wheel.
-   **Keyboard Shortcuts:**
    - U, D, F, B, L, R: Apply clockwise moves.
    - Shift + U, D, F, B, L, R: Apply counterclockwise moves (e.g., Shift+U for U').
-   **Buttons:**
    - **Moves:** Click the individual move buttons (U, D, F, etc.) to apply moves.
    - **Scramble:** Click the "Scramble" button to apply a random scramble sequence.
    - **Solve:** Click the "Solve" button to find and apply a solution using the integrated solver.
    - **Reset:** Click the "Reset" button to return the cube to its solved state.

## Technologies Used

-   HTML, CSS, JavaScript
-   [Three.js](https://threejs.org/) for 3D visualization.
-   [CubeJS](https://github.com/ldez/cubejs) for cube state management and solving algorithms.

## Known Issues

-   Currently, moves are animated, but the visual update of the cubelet colors after rotation is not fully accurate and may not perfectly reflect the internal state. This is an ongoing area of development.