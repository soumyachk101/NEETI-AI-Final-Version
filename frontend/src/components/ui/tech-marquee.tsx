import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TechMarqueeProps {
  items: { icon: React.ElementType; label: string }[];
  className?: string;
}

export function TechMarquee({ items, className }: TechMarqueeProps) {
  // Duplicate items a few times to ensure seamless infinite looping on ultra-wide screens
  const marqueeItems = [...items, ...items, ...items, ...items];

  return (
    <div className={cn("relative flex w-full overflow-hidden py-4 border-y border-white/[0.05] bg-neeti-bg/80 backdrop-blur-md shadow-2xl", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-neeti-bg via-transparent to-neeti-bg z-10 pointer-events-none" />
      
      <motion.div
        className="flex shrink-0 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 30,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {marqueeItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-8 border-r border-white/5 opacity-80 hover:opacity-100 transition-opacity"
          >
            <item.icon className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(212,135,63,0.5)]" />
            <span className="font-mono text-sm tracking-wider text-white">
              {item.label}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// Synced for GitHub timestamp
