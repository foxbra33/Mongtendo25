# 3D Game Engine with Model Management

A simple 3D game engine built with Three.js that allows you to load, position, scale, and delete 3D models.

## Features

- Load 3D models from your local Assets folder
- Position models anywhere in the scene
- Scale models
- Delete models
- Get model positions
- Visual coordinate system with X, Y, Z axes
- Grid helper for spatial reference
- Origin marker (green dot at 0,0,0)
- Blue sky backdrop

## Setup

1. Make sure you have Node.js installed on your system
2. Create an `Assets` folder in the project root directory
3. Place your 3D models (GLTF, GLB, OBJ, FBX) in the Assets folder
4. Install dependencies:
   ```
   npm install
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open your browser and navigate to `http://localhost:3000`

## Usage

### Loading Models
1. Select a model from the dropdown menu
2. Enter a name for the model
3. Set initial position and scale (optional)
4. Click "Load Model"

### Manipulating Models
1. Enter the model name in the "Model Name" field
2. Use the position or scale inputs
3. Click the corresponding action button
4. Use "Get Position" to see current coordinates

### Camera Controls
- WASD: Move camera
- Mouse: Look around
- Q/E: Move up/down
- R: Reset camera

## Supported File Formats
- GLTF (.gltf)
- GLB (.glb)
- OBJ (.obj)
- FBX (.fbx)

## Troubleshooting
- If models don't appear in the dropdown, make sure they are in the Assets folder
- Check the browser console for any error messages
- Ensure the server is running before accessing the application 