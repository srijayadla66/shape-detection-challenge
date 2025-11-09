/**
 * ShapeDetector Class
 * Implements pure mathematical shape detection without ML/AI
 */

class ShapeDetector {
  constructor() {
    this.threshold = 128;
  }

  /**
   * Main detection method
   * @param {ImageData} imageData - Canvas ImageData object
   * @returns {Promise<Object>} Detection results
   */
  async detectShapes(imageData) {
    const startTime = performance.now();
    
    // Step 1: Convert to grayscale
    const grayscale = this.toGrayscale(imageData);
    
    // Step 2: Apply binary threshold
    const binary = this.applyThreshold(grayscale, imageData.width, imageData.height);
    
    // Step 3: Find contours
    const contours = this.findContours(binary, imageData.width, imageData.height);
    
    // Step 4: Analyze and classify each contour
    const shapes = [];
    
    for (const contour of contours) {
      if (contour.length < 10) continue; // Skip noise
      
      const shape = this.analyzeContour(contour);
      if (shape && shape.area > 100) { // Minimum area threshold
        shapes.push(shape);
      }
    }
    
    const processingTime = performance.now() - startTime;
    
    return {
      shapes,
      processingTime,
      imageWidth: imageData.width,
      imageHeight: imageData.height
    };
  }

  /**
   * Convert image to grayscale
   */
  toGrayscale(imageData) {
    const { data, width, height } = imageData;
    const grayscale = new Uint8Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Standard luminosity formula
      grayscale[i / 4] = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    return grayscale;
  }

  /**
   * Apply binary threshold
   */
  applyThreshold(grayscale, width, height) {
    const binary = new Uint8Array(width * height);
    
    for (let i = 0; i < grayscale.length; i++) {
      binary[i] = grayscale[i] < this.threshold ? 0 : 1;
    }
    
    return binary;
  }

  /**
   * Find contours using connected component analysis
   */
  findContours(binary, width, height) {
    const visited = new Uint8Array(width * height);
    const contours = [];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (visited[idx] || binary[idx] === 0) continue;
        
        // Found new contour, trace it
        const contour = this.traceContour(binary, visited, x, y, width, height);
        
        if (contour.length > 0) {
          contours.push(contour);
        }
      }
    }
    
    return contours;
  }

  /**
   * Trace a single contour using boundary following
   */
  traceContour(binary, visited, startX, startY, width, height) {
    const contour = [];
    const queue = [[startX, startY]];
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];
    
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const idx = y * width + x;
      
      if (visited[idx] || binary[idx] === 0) continue;
      
      visited[idx] = 1;
      contour.push({ x, y });
      
      // Check if this is an edge point
      let isEdge = false;
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          if (binary[nidx] === 0) {
            isEdge = true;
          } else if (!visited[nidx]) {
            queue.push([nx, ny]);
          }
        }
      }
    }
    
    return contour;
  }

  /**
   * Analyze contour and classify shape
   */
  analyzeContour(contour) {
    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(contour);
    
    // Calculate center
    const center = {
      x: Math.round(boundingBox.x + boundingBox.width / 2),
      y: Math.round(boundingBox.y + boundingBox.height / 2)
    };
    
    // Calculate area
    const area = boundingBox.width * boundingBox.height;
    
    // Approximate polygon to get vertices
    const polygon = this.approximatePolygon(contour);
    const vertexCount = polygon.length;
    
    // Calculate shape metrics
    const aspectRatio = boundingBox.width / boundingBox.height;
    const perimeter = this.calculatePerimeter(contour);
    const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
    
    // Classify shape
    const { type, confidence } = this.classifyShape(
      vertexCount,
      aspectRatio,
      circularity,
      boundingBox
    );
    
    return {
      type,
      boundingBox,
      center,
      area: Math.round(area),
      confidence: parseFloat(confidence.toFixed(2)),
      vertices: polygon
    };
  }

  /**
   * Calculate bounding box for contour
   */
  calculateBoundingBox(contour) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const point of contour) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Approximate contour to polygon using Douglas-Peucker algorithm
   */
  approximatePolygon(contour, epsilon = 0.02) {
    if (contour.length < 3) return contour;
    
    // Sample contour points for approximation
    const perimeter = this.calculatePerimeter(contour);
    const eps = epsilon * perimeter;
    
    return this.douglasPeucker(contour, eps);
  }

  /**
   * Douglas-Peucker algorithm for polygon approximation
   */
  douglasPeucker(points, epsilon) {
    if (points.length < 3) return points;
    
    // Find point with maximum distance
    let maxDist = 0;
    let index = 0;
    const end = points.length - 1;
    
    for (let i = 1; i < end; i++) {
      const dist = this.perpendicularDistance(
        points[i],
        points[0],
        points[end]
      );
      
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    
    // If max distance is greater than epsilon, recursively simplify
    if (maxDist > epsilon) {
      const left = this.douglasPeucker(points.slice(0, index + 1), epsilon);
      const right = this.douglasPeucker(points.slice(index), epsilon);
      
      return [...left.slice(0, -1), ...right];
    } else {
      return [points[0], points[end]];
    }
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
      );
    }
    
    const num = Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    );
    const den = Math.sqrt(dx * dx + dy * dy);
    
    return num / den;
  }

  /**
   * Calculate perimeter of contour
   */
  calculatePerimeter(contour) {
    let perimeter = 0;
    
    for (let i = 0; i < contour.length; i++) {
      const current = contour[i];
      const next = contour[(i + 1) % contour.length];
      
      perimeter += Math.sqrt(
        Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
      );
    }
    
    return perimeter;
  }

  /**
   * Classify shape based on geometric properties
   */
  classifyShape(vertices, aspectRatio, circularity, boundingBox) {
    let type = 'polygon';
    let confidence = 0.5;
    
    // Circle detection
    if (circularity > 0.75 && Math.abs(aspectRatio - 1) < 0.2) {
      type = 'circle';
      confidence = Math.min(0.95, circularity * 1.1);
    }
    // Triangle detection
    else if (vertices >= 3 && vertices <= 4) {
      type = 'triangle';
      confidence = 0.85;
    }
    // Square detection
    else if (vertices === 4 && Math.abs(aspectRatio - 1) < 0.15) {
      type = 'square';
      confidence = 0.90;
    }
    // Rectangle detection
    else if (vertices === 4) {
      type = 'rectangle';
      confidence = 0.88;
    }
    // Polygon detection
    else if (vertices >= 5) {
      type = 'polygon';
      confidence = 0.80;
    }
    
    return { type, confidence };
  }
}

export default ShapeDetector;
