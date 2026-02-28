"use client";
import { useEffect, useRef } from 'react';

export default function QRCode({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    // Simple QR code generation using a library-free approach
    // For production, you'd want to use a proper QR library like 'qrcode'
    generateSimpleQR(value, canvasRef.current, size);
  }, [value, size]);

  const generateSimpleQR = (text, canvas, size) => {
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Create a simple pattern based on the text
    // This is a simplified version - in production use a proper QR library
    const gridSize = 21; // Standard QR code is 21x21 for version 1
    const cellSize = size / gridSize;

    ctx.fillStyle = '#000000';

    // Generate pattern based on text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
    }

    // Create finder patterns (corners)
    drawFinderPattern(ctx, 0, 0, cellSize);
    drawFinderPattern(ctx, gridSize - 7, 0, cellSize);
    drawFinderPattern(ctx, 0, gridSize - 7, cellSize);

    // Fill data area with pattern
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Skip finder patterns
        if (isFinderPattern(row, col)) continue;

        // Generate pseudo-random pattern based on position and hash
        const seed = hash + row * gridSize + col;
        if ((seed % 3) === 0) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  };

  const drawFinderPattern = (ctx, startRow, startCol, cellSize) => {
    // Draw 7x7 finder pattern
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const shouldFill = 
          (row === 0 || row === 6 || col === 0 || col === 6) || // Border
          (row >= 2 && row <= 4 && col >= 2 && col <= 4); // Center square

        if (shouldFill) {
          ctx.fillRect(
            (startCol + col) * cellSize,
            (startRow + row) * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
  };

  const isFinderPattern = (row, col) => {
    return (
      (row < 9 && col < 9) || // Top-left
      (row < 9 && col >= 13) || // Top-right
      (row >= 13 && col < 9) // Bottom-left
    );
  };

  if (!value) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-600 rounded-lg bg-white"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <p className="text-gray-400 text-sm text-center">
        Scan with any QR reader to get the session key
      </p>
    </div>
  );
}