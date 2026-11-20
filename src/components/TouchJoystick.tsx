import React, { useRef, useState, useEffect } from 'react';

interface TouchJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
}

export const TouchJoystick: React.FC<TouchJoystickProps> = ({ onMove }) => {
  const [touchPos, setTouchPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsActive(true);
    updatePosition(e.touches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive) return;
    updatePosition(e.touches[0]);
  };

  const handleTouchEnd = () => {
    setIsActive(false);
    setTouchPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  const updatePosition = (touch: React.Touch) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const maxRadius = rect.width / 2;

    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const nx = (Math.cos(angle) * clampedDist) / maxRadius;
    const ny = (Math.sin(angle) * clampedDist) / maxRadius;

    setTouchPos({ x: Math.cos(angle) * clampedDist, y: Math.sin(angle) * clampedDist });
    onMove({ x: nx, y: ny });
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-400/30 bg-black/50 touch-none select-none pointer-events-auto"
    >
      <div
        className="h-12 w-12 rounded-full border border-amber-300 bg-amber-500/80 shadow-lg"
        style={{
          transform: `translate(${touchPos.x}px, ${touchPos.y}px)`,
          transition: isActive ? 'none' : 'transform 0.15s ease-out',
        }}
      />
    </div>
  );
};
