'use client';

import { useState, useEffect } from 'react';

interface LightboxProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({ images, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setZoom(1);
      setDragPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 4));
    setDragPosition({ x: 0, y: 0 });
  };

  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  const handleZoomReset = () => {
    setZoom(1);
    setDragPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const scaledW = rect.width * zoom;
      const scaledH = rect.height * zoom;
      const maxX = Math.max(0, (scaledW - rect.width) / 2);
      const maxY = Math.max(0, (scaledH - rect.height) / 2);

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));

      setDragPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[99999] p-2 sm:p-4" onClick={onClose}>
      {/* Zoom Controls */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex gap-1 z-10" onClick={e => e.stopPropagation()}>
        <button onClick={handleZoomOut} className="text-white hover:text-gray-300 p-2 bg-black/50 rounded" title="Zoom Out">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
        </button>
        <button onClick={handleZoomReset} className="text-white hover:text-gray-300 px-3 py-2 bg-black/50 rounded text-sm">{Math.round(zoom * 100)}%</button>
        <button onClick={handleZoomIn} className="text-white hover:text-gray-300 p-2 bg-black/50 rounded" title="Zoom In">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
        </button>
      </div>

      <button onClick={onClose} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 p-2">
        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((currentIndex - 1 + images.length) % images.length); }} className="absolute left-2 sm:left-4 text-white hover:text-gray-300 p-2">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((currentIndex + 1) % images.length); }} className="absolute right-2 sm:right-4 text-white hover:text-gray-300 p-2">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}

      <div className={`max-w-full max-h-full overflow-hidden ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`} onClick={e => e.stopPropagation()} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <img src={images[currentIndex]} alt={`Foto ${currentIndex + 1}`} className="object-contain transition-transform duration-200" style={{ maxWidth: '100%', maxHeight: '85vh', transform: `scale(${zoom}) translate(${dragPosition.x}px, ${dragPosition.y}px)`, transformOrigin: 'center center', cursor: zoom > 1 ? 'grab' : 'zoom-in' }} draggable={false} />
        <p className="text-white text-center mt-2 text-sm">{currentIndex + 1} / {images.length}</p>
      </div>
    </div>
  );
}