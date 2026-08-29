"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: "fade-up" | "fade" | "zoom" | "left" | "right";
  delay?: number; // in milliseconds
  duration?: number; // in milliseconds
  stagger?: boolean;
  threshold?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "article" | "aside" | "header" | "footer" | "main";
  id?: string;
  once?: boolean;
}

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration,
  stagger = false,
  threshold = 0.1,
  className = "",
  style = {},
  as: Component = "div",
  id,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback for environments without IntersectionObserver
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  const animationClass =
    animation === "fade"
      ? "scroll-reveal-fade"
      : animation === "zoom"
      ? "scroll-reveal-zoom"
      : animation === "left"
      ? "scroll-reveal-left"
      : animation === "right"
      ? "scroll-reveal-right"
      : "scroll-reveal";

  const staggerClass = stagger ? "stagger-container" : "";

  const customStyle: React.CSSProperties = {
    ...style,
    ...(delay > 0 ? { transitionDelay: `${delay}ms` } : {}),
    ...(duration ? { transitionDuration: `${duration}ms` } : {}),
  };

  return (
    <Component
      ref={ref as any}
      id={id}
      className={`${animationClass} ${staggerClass} ${
        isVisible ? "is-visible" : ""
      } ${className}`.trim()}
      style={customStyle}
    >
      {children}
    </Component>
  );
}
