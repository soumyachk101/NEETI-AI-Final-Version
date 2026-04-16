// Vite project — no "use client" directive needed

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(181, 146, 88)", // primary-ish
  width,
  height,
  className,
  maxOpacity = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = useMemo(() => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return "181, 146, 88";
    return rgb.join(", ");
  }, [color]);

  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        setCanvasSize({
          width: width || parent.clientWidth,
          height: height || parent.clientHeight,
        });
      }
    }
  }, [width, height]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      observer.disconnect();
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0 || !isInView) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    const cols = Math.floor(canvasSize.width / (squareSize + gridGap));
    const rows = Math.floor(canvasSize.height / (squareSize + gridGap));
    const squares = new Float32Array(cols * rows);

    for (let i = 0; i < squares.length; i++) {
      squares[i] = Math.random() * maxOpacity;
    }

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (Math.random() < flickerChance * 0.1) {
            squares[i * rows + j] = Math.random() * maxOpacity;
          }

          const opacity = squares[i * rows + j];
          ctx.fillStyle = `rgba(${memoizedColor}, ${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap),
            j * (squareSize + gridGap),
            squareSize,
            squareSize
          );
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [canvasSize, squareSize, gridGap, flickerChance, memoizedColor, isInView, maxOpacity]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

// Synced for GitHub timestamp
