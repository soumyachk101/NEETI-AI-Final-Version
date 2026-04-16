import React, { type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface TechOrbitProps {
  items: { icon: React.ElementType; label: string }[];
  radius?: number;
  speed?: number;
  className?: string;
  centerContent?: ReactNode;
}

export function TechOrbit({
  items,
  radius = 160,
  speed = 0.02,
  className,
  centerContent,
}: TechOrbitProps) {
  const rotation = useMotionValue(0);
  const springRotation = useSpring(rotation, {
    stiffness: 50,
    damping: 20,
    mass: 1,
  });

  // Animation loop
  React.useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      rotation.set(rotation.get() + speed);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [speed, rotation]);

  return (
    <div className={cn("relative flex items-center justify-center p-20", className)}>
      {/* Background Orbits - Blueprint Style */}
      <div 
        className="absolute rounded-full border border-white/10"
        style={{ width: radius * 2, height: radius * 2 }}
      />
      <div 
        className="absolute rounded-full border border-primary/20 shadow-[0_0_20px_rgba(212,135,63,0.05)]"
        style={{ width: radius * 2 * 0.9, height: radius * 2 * 0.9 }}
      />
      <div 
        className="absolute rounded-full border border-white/5 opacity-50"
        style={{ width: radius * 2.8, height: radius * 2.8 }}
      />

      {/* Center Content with Technical Corners */}
      <div className="relative z-20 flex items-center justify-center">
        <div className="absolute -inset-8 border-t border-l border-primary/30 w-4 h-4 rounded-tl-sm pointer-events-none" />
        <div className="absolute -inset-8 top-auto left-auto border-b border-r border-primary/30 w-4 h-4 rounded-br-sm pointer-events-none" />
        
        <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full animate-pulse" />
        {centerContent || (
          <div className="text-center relative">
            <span className="text-[10px] font-mono text-primary tracking-[0.2em] uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
              Tech Engine
            </span>
          </div>
        )}
      </div>

      {/* Orbiting Items */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => {
          rotation.set(rotation.get() + info.delta.x * 0.005);
        }}
        className="absolute inset-0 z-30 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {items.map((item, index) => {
          const angle = (index / items.length) * Math.PI * 2;
          
          return (
            <OrbitingItem
              key={item.label}
              item={item}
              angle={angle}
              radius={radius}
              rotation={springRotation}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

function OrbitingItem({ item, angle, radius, rotation }: { item: { icon: React.ElementType; label: string }, angle: number, radius: number, rotation: MotionValue<number> }) {
  // Calculate position based on rotation and initial angle
  const x = useTransform(rotation, (r) => Math.cos(angle + r) * radius);
  const y = useTransform(rotation, (r) => Math.sin(angle + r) * (radius * 0.4)); // Elliptical for perspective
  const zIndex = useTransform(rotation, (r) => Math.sin(angle + r) > 0 ? 40 : 10);
  const scale = useTransform(rotation, (r) => {
    const s = Math.sin(angle + r);
    return 0.8 + (s + 1) * 0.2; // Smaller when "behind"
  });
  const opacity = useTransform(rotation, (r) => {
    const s = Math.sin(angle + r);
    return 0.4 + (s + 1) * 0.3; // Fader when "behind"
  });

  return (
    <motion.div
      style={{
        x,
        y,
        zIndex,
        scale,
        opacity,
      }}
      className="absolute flex items-center gap-3 bg-zinc-900/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/50 hover:bg-zinc-800 transition-colors group select-none"
    >
      <div className="p-1.5 rounded-lg bg-white/10 text-white group-hover:bg-white/20 group-hover:scale-110 transition-all">
        <item.icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-mono text-white/70 group-hover:text-white whitespace-nowrap">
        {item.label}
      </span>
    </motion.div>
  );
}

// Synced for GitHub timestamp
