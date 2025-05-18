/**
 * CubeVisual.js
 * Handles the 3D visualization of the Rubik's Cube using Three.js
 */

class CubeVisual {
    constructor(cubeState, containerId) {
        this.cubeState = cubeState;
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found.`);
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null; // OrbitControls

        this.cubeGroup = new THREE.Group(); // Group to hold all cubelets
        this.cubelets = []; // Array to hold individual cubelet meshes

        this.moveQueue = []; // Queue for move animations
        this.isAnimating = false;

        this.initScene();
        this.createCube();
        this.addEventListeners();

        // Update the cube visualization when the state changes
        this.cubeState.onStateChange = this.updateCube.bind(this);

        // Initial render
        this.animate();
    }

    initScene() {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(0xf0f0f0); // Light gray background
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);

        // Add OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // smooth zooming/panning
        this.controls.dampingFactor = 0.25;
        this.controls.enableZoom = true;

        this.scene.add(this.cubeGroup);
    }

    createCube() {
        const stickerColors = {
            U: 0xffffff, // White
            D: 0xffff00, // Yellow
            F: 0x00ff00, // Green
            B: 0x0000ff, // Blue
            L: 0xffa500, // Orange
            R: 0xff0000, // Red
            _ : 0x303030  // Black (for hidden faces)
        };

        this.pieceSize = 1;
        this.gap = 0.05;
        const totalSize = this.pieceSize * 3 + this.gap * 2;
        const offset = totalSize / 2 - this.pieceSize / 2;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                    // Only create actual cubelets (not the center void)
                    if (x === 1 && y === 1 && z === 1) continue;

                    const geometry = new THREE.BoxGeometry(this.pieceSize, this.pieceSize, this.pieceSize);
                    const materials = [
                        new THREE.MeshPhongMaterial({ color: stickerColors._ }), // Right face (+x)
                        new THREE.MeshPhongMaterial({ color: stickerColors._ }), // Left face (-x)
                        new THREE.MeshPhongMaterial({ color: stickerColors._ }), // Top face (+y)
                        new THREE.MeshPhongMaterial({ color: stickerColors._ }), // Bottom face (-y)
                        new THREE.MeshPhongMaterial({ color: stickerColors._ }), // Front face (+z)
                        new THREE.MeshPhongMaterial({ color: stickerColors._ })  // Back face (-z)
                    ];

                    const cubelet = new THREE.Mesh(geometry, materials);

                    // Position the cubelet
                    cubelet.position.set(
                        (x - 1) * (this.pieceSize + this.gap),
                        (y - 1) * (this.pieceSize + this.gap),
                        (z - 1) * (this.pieceSize + this.gap)
                    );

                    // Store original position for grouping during animations
                    cubelet.originalPosition = cubelet.position.clone();

                    this.cubelets.push(cubelet);
                    this.cubeGroup.add(cubelet);
                }
            }
        }
        this.updateCube(); // Set initial sticker colors
    }

    updateCube() {
        const stickerColors = {
            0: 0xffffff, // U - White
            1: 0xffff00, // D - Yellow
            2: 0x00ff00, // F - Green
            3: 0x0000ff, // B - Blue
            4: 0xffa500, // L - Orange
            5: 0xff0000 // R - Red
        };

        // Reset all cubelet face colors to black initially
        this.cubelets.forEach(cubelet => {
            cubelet.material.forEach(mat => mat.color.setHex(0x303030));
        });

        // Define local direction vectors for each face of a cubelet (in its local coordinate space)
        const localFaceDirections = [
            new THREE.Vector3(1, 0, 0),  // Right (+x) - material 0
            new THREE.Vector3(-1, 0, 0), // Left (-x) - material 1
            new THREE.Vector3(0, 1, 0),  // Top (+y) - material 2
            new THREE.Vector3(0, -1, 0), // Bottom (-y) - material 3
            new THREE.Vector3(0, 0, 1),  // Front (+z) - material 4
            new THREE.Vector3(0, 0, -1)  // Back (-z) - material 5
        ];

        // World axis vectors for comparison (aligned with the whole cube's faces in solved state)
        const worldAxes = [
            { vector: new THREE.Vector3(1, 0, 0), faceIndex: 5 }, // +X (R)
            { vector: new THREE.Vector3(-1, 0, 0), faceIndex: 4 }, // -X (L)
            { vector: new THREE.Vector3(0, 1, 0), faceIndex: 0 },  // +Y (U)
            { vector: new THREE.Vector3(0, -1, 0), faceIndex: 1 }, // -Y (D)
            { vector: new THREE.Vector3(0, 0, 1), faceIndex: 2 },  // +Z (F)
            { vector: new THREE.Vector3(0, 0, -1), faceIndex: 3 } // -Z (B)
        ];

        const tolerance = 0.1; // Tolerance for direction comparison

        // Temporary vectors for calculations
        const tempLocalDirection = new THREE.Vector3();
        const tempWorldDirection = new THREE.Vector3();
        const tempWorldPosition = new THREE.Vector3();

        // Iterate through each cubelet and its faces
        this.cubelets.forEach(cubelet => {
            const worldMatrix = cubelet.matrixWorld;
            cubelet.getWorldPosition(tempWorldPosition); // Get cubelet's world position

            localFaceDirections.forEach((localDirection, materialIndex) => {
                // Transform local face direction to world space
                tempWorldDirection.copy(localDirection).applyMatrix4(worldMatrix).normalize();

                let bestMatch = null;
                let maxDot = -Infinity;

                // Determine which whole-cube face this cubelet face is pointing towards
                worldAxes.forEach((worldAxis) => {
                    const dot = tempWorldDirection.dot(worldAxis.vector);
                    if (dot > maxDot) {
                        maxDot = dot;
                        bestMatch = worldAxis;
                    }
                });

                // If the alignment is strong enough and we found a matching whole-cube face
                if (maxDot > 0.8 && bestMatch !== null) { // Use a threshold like 0.8
                    const currentFaceIndex = bestMatch.faceIndex;

                    // Now we need to determine the row and column within this face.
                    // This is the complex part. We need to project the cubelet's world position
                    // onto the plane of the identified face and then map that 2D position to a 3x3 grid.

                    // For this simplified approach, let's try mapping world position to row/col
                    // based on the identified face's coordinate system.
                    let row = -1, col = -1;

                    // Example mapping for U face (+Y):
                    if (currentFaceIndex === 0) { // U face (+Y)
                        // Project world position onto the XZ plane of the U face
                        // Map X world coordinate to col (approx -1.05 -> 0, 0 -> 1, 1.05 -> 2)
                        col = Math.round((tempWorldPosition.x + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap));
                        // Map Z world coordinate to row (approx 1.05 -> 0, 0 -> 1, -1.05 -> 2) - Note the inverse mapping
                        row = Math.round((-tempWorldPosition.z + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap));
                    }
                    // Add mapping logic for other faces (D, F, B, L, R)

                    // D face (-Y)
                     else if (currentFaceIndex === 1) {
                          col = Math.round((tempWorldPosition.x + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap));
                          row = Math.round((tempWorldPosition.z + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the direct mapping for Z
                     }
                     // F face (+Z)
                     else if (currentFaceIndex === 2) {
                          col = Math.round((tempWorldPosition.x + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap));
                          row = Math.round((-tempWorldPosition.y + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the inverse mapping for Y
                     }
                     // B face (-Z)
                     else if (currentFaceIndex === 3) {
                          col = Math.round((-tempWorldPosition.x + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the inverse mapping for X
                          row = Math.round((-tempWorldPosition.y + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the inverse mapping for Y
                     }
                      // L face (-X)
                      else if (currentFaceIndex === 4) {
                           col = Math.round((tempWorldPosition.z + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap));
                           row = Math.round((-tempWorldPosition.y + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the inverse mapping for Y
                      }
                       // R face (+X)
                       else if (currentFaceIndex === 5) {
                            col = Math.round((-tempWorldPosition.z + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the inverse mapping for Z
                            row = Math.round((-tempWorldPosition.y + (this.pieceSize + this.gap)) / (this.pieceSize + this.gap)); // Note the inverse mapping for Y
                       }


                    // Ensure row and col are within the 0-2 range
                    row = Math.max(0, Math.min(2, row));
                    col = Math.max(0, Math.min(2, col));

                    // Get the sticker color from the state using the determined face, row, and col
                    const stickerColorIndex = this.cubeState.getColor(currentFaceIndex, row, col);
                    const colorHex = stickerColors[stickerColorIndex];

                    // Set the color of the cubelet's material
                    if (cubelet.material[materialIndex]) {
                        cubelet.material[materialIndex].color.setHex(colorHex);
                    }

                } else {
                    // If no strong alignment, set to black (internal face)
                    cubelet.material[materialIndex].color.setHex(0x303030);
                }
            });
        });
    }


    addEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update(); // required if damping enabled
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Resets the visual cube to the solved state with animation
     * @param {boolean} animated - Whether to animate the reset
     * @returns {Promise<void>} - Promise that resolves when the reset is complete
     */
    async reset(animated = true) {
         // This is a placeholder. A full animated reset would involve
         // reversing the move history with animation or
         // animating cubelets back to their solved positions.
         // For now, we will just reset the internal state and update the visualization.

         this.cubeState.reset();
         this.updateCube();

         // If animated is true, you would add animation logic here.
         // Since we're just resetting the internal state and updating the view,
         // the animation part is not implemented in this basic version.

         console.log("Visual cube reset (non-animated)");
         return Promise.resolve(); // Resolve immediately
    }


     /**
      * Applies a sequence of moves with animation
      * @param {string[]} moves - An array of moves (e.g., ["R", "U'", "F2"])
      * @param {boolean} animated - Whether to animate the moves
      * @returns {Promise<void>} - Promise that resolves when the animation is complete
      */
    async applyMoves(moves, animated = true) {
        if (!Array.isArray(moves)) {
            console.error("Invalid moves array provided:", moves);
            return;
        }

        for (const move of moves) {
            // Apply the move to the internal state first
            this.cubeState.applyMove(move);

            if (animated) {
                // Add move to the animation queue
                this.moveQueue.push(move);
                if (!this.isAnimating) {
                    this.processMoveQueue();
                }
                await new Promise(resolve => {
                    // Resolve when the move animation is complete
                    const checkQueue = setInterval(() => {
                        if (!this.isAnimating && this.moveQueue.length === 0) {
                            clearInterval(checkQueue);
                            resolve();
                        }
                    }, 50);
                });
            } else {
                // If not animated, just update the visual state directly after each move
                this.updateCube();
            }
        }

        // Ensure the visual state matches the internal state after applying moves
        this.updateCube();
    }


    async processMoveQueue() {
         if (this.moveQueue.length === 0) {
             this.isAnimating = false;
             return;
         }

         this.isAnimating = true;
         const move = this.moveQueue.shift();
         console.log("Animating move:", move);

         try {
             await this.rotateMove(move, true); // Animate the single move
         } catch (error) {
             console.error("Error animating move:", move, error);
         }

         // Process the next move in the queue after the current one is done
         this.processMoveQueue();
    }


     /**
      * Rotates a specific face or layer with animation
      * @param {string} move - The move in standard notation (e.g., "U", "R'", "F2")
      * @param {boolean} animated - Whether to animate the move
      * @returns {Promise<void>} - Promise that resolves when the rotation is complete
      */
     async rotateMove(move, animated = true) {
         console.log("Attempting to visualize move:", move);

         if (!animated) {
             this.updateCube(); // Just update the visual state if not animated
             console.log("Move applied (no animation):", move);
             return Promise.resolve();
         }

         // Parse the move
         const face = move[0];
         const modifier = move.slice(1);
         let angle = Math.PI / 2; // 90 degrees

         if (modifier === "'") {
             angle = -Math.PI / 2; // -90 degrees
         } else if (modifier === "2") {
             angle = Math.PI; // 180 degrees
         }

         let axis = new THREE.Vector3(0, 0, 0);
         const pieceSize = 1;
         const gap = 0.05;
         const layerThreshold = (pieceSize + gap) / 2; // Threshold to determine which layer a cubelet is in

         // Determine the rotation axis and select cubelets for the layer
         const cubeletsToRotate = [];
         switch (face) {
             case 'R':
                 axis.x = 1;
                 this.cubelets.forEach(cubelet => {
                     if (cubelet.position.x > layerThreshold) {
                         cubeletsToRotate.push(cubelet);
                     }
                 });
                 break;
             case 'L':
                 axis.x = -1;
                  this.cubelets.forEach(cubelet => {
                      if (cubelet.position.x < -layerThreshold) {
                          cubeletsToRotate.push(cubelet);
                      }
                  });
                 break;
             case 'U':
                 axis.y = 1;
                  this.cubelets.forEach(cubelet => {
                      if (cubelet.position.y > layerThreshold) {
                          cubeletsToRotate.push(cubelet);
                      }
                  });
                 break;
             case 'D':
                 axis.y = -1;
                  this.cubelets.forEach(cubelet => {
                      if (cubelet.position.y < -layerThreshold) {
                          cubeletsToRotate.push(cubelet);
                      }
                  });
                 break;
             case 'F':
                 axis.z = 1;
                  this.cubelets.forEach(cubelet => {
                      if (cubelet.position.z > layerThreshold) {
                          cubeletsToRotate.push(cubelet);
                      }
                  });
                 break;
             case 'B':
                 axis.z = -1;
                  this.cubelets.forEach(cubelet => {
                      if (cubelet.position.z < -layerThreshold) {
                          cubeletsToRotate.push(cubelet);
                      }
                  });
                 break;
             default:
                 console.warn("Attempted to rotate with an invalid move face:", face);
                 this.updateCube(); // Update visual just in case internal state changed
                 return Promise.resolve(); // Resolve immediately for invalid moves
         }

         if (cubeletsToRotate.length === 0) {
              console.warn("No cubelets found to rotate for move:", move);
               this.updateCube(); // Update visual just in case internal state changed
              return Promise.resolve(); // Resolve immediately if no cubelets found
         }

         // Create a temporary group for the rotating layer
         const rotatingGroup = new THREE.Group();
         this.scene.add(rotatingGroup);

         // Parent the selected cubelets to the temporary group
         cubeletsToRotate.forEach(cubelet => {
             // Convert cubelet's position to be relative to the scene before parenting
             // This is important if the cubeGroup itself has transformations
             this.scene.attach(cubelet); // Detach from parent (cubeGroup) and attach to scene temporarily
             rotatingGroup.attach(cubelet); // Attach to rotatingGroup
         });

         // Animation logic (using a simple tween or manual update in animate loop)
         // This is a placeholder for the actual animation.
         return new Promise(resolve => {
             const duration = 200; // Animation duration in milliseconds
             const startRotation = rotatingGroup.quaternion.clone();
             const endRotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);

             let startTime = performance.now();

             const animateRotation = (currentTime) => {
                 const elapsedTime = currentTime - startTime;
                 const progress = Math.min(elapsedTime / duration, 1);

                 // Slerp (Spherical Linear Interpolation) for smoother rotation
                 rotatingGroup.quaternion.copy(startRotation).slerp(endRotation, progress);

                 if (progress < 1) {
                     requestAnimationFrame(animateRotation);
                 } else {
                     // Animation complete

                     // Unparent cubelets and update their positions/rotations
                     cubeletsToRotate.forEach(cubelet => {
                         console.log("Before re-parenting - cubelet position:", cubelet.position.toArray(), "quaternion:", cubelet.quaternion.toArray());
                         console.log("Before re-parenting - cubelet world position:", cubelet.getWorldPosition(new THREE.Vector3()).toArray(), "world quaternion:", cubelet.getWorldQuaternion(new THREE.Quaternion()).toArray());
                         
                         this.cubeGroup.attach(cubelet); // Detach from rotatingGroup and attach back to cubeGroup
                         
                         console.log("After re-parenting - cubelet position (local to cubeGroup):", cubelet.position.toArray(), "quaternion (local to cubeGroup):", cubelet.quaternion.toArray());
                         console.log("After re-parenting - cubelet world position:", cubelet.getWorldPosition(new THREE.Vector3()).toArray(), "world quaternion:", cubelet.getWorldQuaternion(new THREE.Quaternion()).toArray());
                     });

                     // Remove the temporary rotating group
                     this.scene.remove(rotatingGroup);

                     // Update the sticker colors based on the new internal state
                     this.updateCube();
                     console.log("Move animation complete:", move);
                     resolve();
                 }
             };

             requestAnimationFrame(animateRotation);
         });
     }
 }