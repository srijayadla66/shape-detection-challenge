import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Play } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import ShapeDetector from '../utils/ShapeDetector';

const ShapeDetection = () => {
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const detector = useRef(new ShapeDetector());

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setResults(null);
    };
    reader.readAsDataURL(file);
  };

  const detectShapes = async () => {
    if (!image) return;

    setProcessing(true);
    setResults(null);

    try {
      // Load image to canvas
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect shapes
        const detectionResults = await detector.current.detectShapes(imageData);
        
        // Draw overlays
        drawShapeOverlays(detectionResults.shapes);
        
        setResults(detectionResults);
        setProcessing(false);
      };
      img.src = image;
    } catch (error) {
      console.error('Detection error:', error);
      setProcessing(false);
    }
  };

  const drawShapeOverlays = (shapes) => {
    const canvas = overlayCanvasRef.current;
    const mainCanvas = canvasRef.current;
    
    if (!canvas || !mainCanvas) return;
    
    canvas.width = mainCanvas.width;
    canvas.height = mainCanvas.height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const colors = {
      circle: '#10b981',
      triangle: '#3b82f6',
      rectangle: '#f59e0b',
      square: '#ef4444',
      polygon: '#8b5cf6'
    };
    
    shapes.forEach((shape, index) => {
      const color = colors[shape.type] || '#6b7280';
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        shape.boundingBox.x,
        shape.boundingBox.y,
        shape.boundingBox.width,
        shape.boundingBox.height
      );
      
      // Draw center point
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(shape.center.x, shape.center.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw label
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(
        `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} (${Math.round(shape.confidence * 100)}%)`,
        shape.boundingBox.x,
        shape.boundingBox.y - 10
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Shape Detection Challenge
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            AI-free geometric shape detection using pure mathematical algorithms
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Canvas */}
          <div className="space-y-6">
            {/* Upload Area */}
            {!image && (
              <Card className="p-8">
                <div
                  className={`relative border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-slate-100 rounded-full">
                      <Upload className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700 mb-2">
                        Drop an image here, or click to select
                      </p>
                      <p className="text-sm text-slate-500">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Select Image
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Canvas Display */}
            {image && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Image Analysis
                    </h3>
                    <Button
                      onClick={() => {
                        setImage(null);
                        setResults(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                  
                  <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto"
                      style={{ display: 'block' }}
                    />
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute top-0 left-0 w-full h-auto pointer-events-none"
                    />
                  </div>

                  <Button
                    onClick={detectShapes}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Detect Shapes
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {results && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6">
                    <div className="text-sm text-slate-600 mb-1">Shapes Detected</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {results.shapes.length}
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-sm text-slate-600 mb-1">Processing Time</div>
                    <div className="text-3xl font-bold text-green-600">
                      {Math.round(results.processingTime)}ms
                    </div>
                  </Card>
                </div>

                {/* Detection Results */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Detection Results
                  </h3>
                  
                  {results.shapes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No shapes detected in the image
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {results.shapes.map((shape, index) => (
                        <div
                          key={index}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    shape.type === 'circle'
                                      ? '#10b981'
                                      : shape.type === 'triangle'
                                      ? '#3b82f6'
                                      : shape.type === 'rectangle'
                                      ? '#f59e0b'
                                      : shape.type === 'square'
                                      ? '#ef4444'
                                      : '#8b5cf6',
                                }}
                              />
                              <span className="font-semibold text-slate-900 capitalize">
                                {shape.type}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-slate-700">
                                {Math.round(shape.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-500">Center:</span>
                              <span className="ml-2 text-slate-700 font-medium">
                                ({shape.center.x}, {shape.center.y})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Area:</span>
                              <span className="ml-2 text-slate-700 font-medium">
                                {shape.area}px²
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-500">Bounding Box:</span>
                              <span className="ml-2 text-slate-700 font-medium">
                                {shape.boundingBox.width}×{shape.boundingBox.height} at ({shape.boundingBox.x}, {shape.boundingBox.y})
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Performance Badge */}
                {results.processingTime < 2000 && (
                  <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-900">
                          Performance Target Met!
                        </div>
                        <div className="text-sm text-green-700">
                          Processing completed in under 2 seconds
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* Info Card */}
            {!results && (
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-slate-50">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  How It Works
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">1.</span>
                    <span>Upload an image containing geometric shapes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">2.</span>
                    <span>Pure mathematical algorithms analyze the image</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">3.</span>
                    <span>Shapes are detected, classified, and measured</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">4.</span>
                    <span>Results include bounding boxes, centers, areas, and confidence scores</span>
                  </li>
                </ul>
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-sm font-semibold text-slate-700 mb-2">
                    Detectable Shapes:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Circle', 'Triangle', 'Rectangle', 'Square', 'Polygon'].map((shape) => (
                      <span
                        key={shape}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700"
                      >
                        {shape}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShapeDetection;
