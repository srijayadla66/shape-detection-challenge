# Shape Detection Challenge

## Overview

This project is a browser-based geometric shape detection system that identifies and classifies shapes using pure mathematical algorithms.  
It demonstrates how geometric logic and the HTML Canvas API can be used for image analysis without any AI or machine learning models.

---

## Features

- Detects circles, triangles, rectangles, squares, and polygons  
- Built entirely with React and native JavaScript  
- Provides bounding boxes, center points, areas, and confidence scores  
- Uses mathematical image analysis only, no external ML libraries  
- Fast detection with average processing time under two seconds  
- Responsive interface with drag-and-drop image upload  

---

## How It Works

1. Converts the uploaded image to grayscale  
2. Applies binary thresholding to separate objects from the background  
3. Detects edges and traces contours using connected component analysis  
4. Simplifies boundaries with the Douglas–Peucker algorithm  
5. Classifies shapes based on geometric properties such as:
   - Circularity and equal width/height for circles  
   - Three vertices for triangles  
   - Four vertices with unequal sides for rectangles  
   - Four vertices with equal sides for squares  
   - Five or more vertices for polygons  

---

## Technology Stack

- React 19  
- Tailwind CSS  
- CRACO build configuration  
- Lucide React for icons  
- HTML Canvas API for pixel-level analysis  
- Pure JavaScript for all shape detection logic  

---

## Getting Started

### Installation

```bash
cd frontend
npm install --legacy-peer-deps

## Screenshots

### 1. Home Page
![Home Page](frontend/public/screenshots/Homepage.png)

### 2. Test Images
![Test Images](frontend/public/screenshots/Testimages.png)

### 3. Detection Results - Example 1
![Detection Results 1](frontend/public/screenshots/detectionresults1.png)

### 4. Detection Results - Example 2
![Detection Results 2](frontend/public/screenshots/detectionresults2.png)

<img width="1909" height="1011" alt="Screenshot 2025-11-09 143146" src="https://github.com/user-attachments/assets/d656eeda-9b68-4438-902b-5df3c999a9be" />
<img width="1919" height="1003" alt="Screenshot 2025-11-09 143205" src="https://github.com/user-attachments/assets/ccab4fe8-1758-407c-ad91-2d048e5be3f1" />
<img width="1910" height="997" alt="Screenshot 2025-11-09 144042" src="https://github.com/user-attachments/assets/f51de774-36b6-435e-b8be-bc3da39017b0" />
<img width="1919" height="1007" alt="Screenshot 2025-11-09 143053" src="https://github.com/user-attachments/assets/08d7f9d0-9d21-4d10-9711-ef0ee55e1abe" />



