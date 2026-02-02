"use client";

import { motion, useReducedMotion } from "framer-motion";

export function useFadeUpVariants() {
  const reduced = useReducedMotion();
  return {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: reduced
          ? {}
          : { staggerChildren: 0.08, delayChildren: 0.08 },
      },
    },
    item: {
      hidden: { opacity: 0, y: reduced ? 0 : 14 },
      show: {
        opacity: 1,
        y: 0,
        transition: reduced ? {} : { duration: 0.55, ease: "easeOut" },
      },
    },
  };
}

export function MotionDiv(props) {
  return <motion.div {...props} />;
}

export function MotionA(props) {
  return <motion.a {...props} />;
}

export function MotionButton(props) {
  return <motion.button {...props} />;
}
