# Shape Detection Challenge

AI-free, browser-based geometric shape detection system using native JavaScript/TypeScript and mathematical image analysis.

## 🎯 Overview

This project implements a complete shape detection system that:
- Detects geometric shapes in images (circles, triangles, rectangles, squares, polygons)
- Classifies shapes accurately using geometric rules
- Returns bounding boxes, centers, areas, and confidence scores
- Works entirely in the browser without external libraries or ML models

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Important**: Compile TypeScript first:
```bash
npm run build
```
This creates the `dist/main.js` file that the browser needs.

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:8080`

**Note**: If you make changes to `src/main.ts`, you need to run `npm run build` again, or use `npm run watch` to automatically recompile on changes.

## 📁 Project Structure

```
shape-detection/
├── src/
│   ├── main.ts          # Core ShapeDetector implementation
│   ├── app.js           # UI application logic
│   └── style.css        # UI styling
├── test-images/         # Test images directory
├── expected_results.json # Ground-truth results (optional)
├── index.html           # Browser UI
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## 🔧 How It Works

### Algorithm Steps

1. **Preprocessing**: Convert RGB to grayscale using luminance formula
2. **Thresholding**: Apply Otsu's method for optimal binary segmentation
3. **Noise Reduction**: Median filter to remove noise
4. **Edge Detection**: Sobel operator for edge detection
5. **Contour Extraction**: Border following algorithm to trace shapes
6. **Polygon Approximation**: Douglas-Peucker algorithm to simplify contours
7. **Shape Classification**: Geometric analysis (circularity, vertex count, aspect ratio)
8. **Feature Calculation**: Bounding box, center, area, confidence

### Shape Classification Rules

- **Circle**: Circularity > 0.7, aspect ratio ≈ 1.0
- **Triangle**: 3 vertices
- **Square**: 4 vertices, aspect ratio ≈ 1.0
- **Rectangle**: 4 vertices, aspect ratio ≠ 1.0
- **Polygon**: 5+ vertices

## 📊 Output Format

```json
{
  "shapes": [
    {
      "type": "circle",
      "boundingBox": { "x": 120, "y": 85, "width": 50, "height": 50 },
      "center": { "x": 145, "y": 110 },
      "area": 1963.5,
      "confidence": 0.95
    }
  ]
}
```

## 🧪 Testing

1. Place test images in the `test-images/` folder
2. Upload images through the web interface
3. Compare results with `expected_results.json` (if available)
4. Validate:
   - Shape count accuracy
   - Classification correctness
   - Bounding box IoU
   - Center point accuracy
   - Area calculation

## ⚙️ Performance

- Target: < 2000ms per image
- Accuracy: ≥ 90% detection, ≥ 85% classification
- Bounding Box IoU: ≥ 0.7
- Center Accuracy: ≤ 10 pixels deviation
- Area Error: ≤ 15% deviation

## 🛠️ Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Development Server
```bash
npm run dev
```

## 📝 Technical Details

### Key Algorithms

- **Otsu's Thresholding**: Automatic optimal threshold selection
- **Sobel Edge Detection**: Gradient-based edge detection
- **Border Following**: Contour tracing algorithm
- **Douglas-Peucker**: Polygon simplification
- **Shoelace Formula**: Area calculation

### Mathematical Formulas

- **Grayscale**: `gray = 0.299*R + 0.587*G + 0.114*B`
- **Circularity**: `(4π * area) / perimeter²`
- **Aspect Ratio**: `width / height`

## 🚫 Constraints

- ❌ No external CV libraries (OpenCV, TensorFlow, etc.)
- ❌ No pre-trained ML models
- ✅ Only standard browser APIs and math-based logic
- ✅ Handles rotation, small shapes, overlapping shapes, and noise

## 📄 License

MIT

## 👤 Author

Shape Detection Challenge Implementation

