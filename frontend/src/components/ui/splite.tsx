'use client'

import Spline from '@splinetool/react-spline'
import { useRef } from 'react'
import { useInView } from 'framer-motion'

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: false, amount: 0.1 })

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {isInView && (
        <Spline
          scene={scene}
          className={className}
        />
      )}
    </div>
  )
}

// Synced for GitHub timestamp
