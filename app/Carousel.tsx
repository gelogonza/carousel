'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const defaultSlides = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=88',
];

export type CarouselProps = {
  images?: string[];
  className?: string;
  ariaLabel?: string;
};

type Animation = {
  from: number;
  to: number;
  startedAt: number;
  duration: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutQuart = (progress: number) => 1 - Math.pow(1 - progress, 4);

export default function Carousel({
  images = defaultSlides,
  className = '',
  ariaLabel = 'Image carousel',
}: CarouselProps) {
  const slides = images.length > 0 ? images : defaultSlides;
  const lastSlide = slides.length - 1;
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const dragVelocityRef = useRef(0);
  const pointerRef = useRef({ id: -1, x: 0, time: 0 });
  const animationRef = useRef<Animation | null>(null);
  const frameRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<number | null>(null);

  const animate = useCallback(function animateFrame(time: number) {
    const animation = animationRef.current;
    if (!animation) {
      frameRef.current = null;
      return;
    }

    const progress = clamp((time - animation.startedAt) / animation.duration, 0, 1);
    const nextPosition = animation.from + (animation.to - animation.from) * easeOutQuart(progress);
    positionRef.current = nextPosition;
    setPosition(nextPosition);

    if (progress === 1) {
      positionRef.current = animation.to;
      setPosition(animation.to);
      animationRef.current = null;
      frameRef.current = null;
      return;
    }

    frameRef.current = requestAnimationFrame(animateFrame);
  }, []);

  const animateTo = useCallback((target: number, duration = 390) => {
    const nextTarget = clamp(target, 0, lastSlide);
    targetRef.current = nextTarget;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      positionRef.current = nextTarget;
      setPosition(nextTarget);
      animationRef.current = null;
      frameRef.current = null;
      return;
    }

    const distance = Math.abs(nextTarget - positionRef.current);
    animationRef.current = {
      from: positionRef.current,
      to: nextTarget,
      startedAt: performance.now(),
      duration: clamp(duration + distance * 35, 220, 480),
    };
    frameRef.current = requestAnimationFrame(animate);
  }, [animate, lastSlide]);

  const goTo = useCallback((index: number) => {
    animateTo(index);
  }, [animateTo]);

  useEffect(() => {
    const nextPosition = clamp(positionRef.current, 0, lastSlide);
    positionRef.current = nextPosition;
    targetRef.current = nextPosition;
    setPosition(nextPosition);
  }, [lastSlide]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    animationRef.current = null;
    targetRef.current = positionRef.current;
    pointerRef.current = { id: event.pointerId, x: event.clientX, time: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragVelocityRef.current = 0;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== event.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - pointerRef.current.x;
    const dt = Math.max(now - pointerRef.current.time, 1);
    const scale = Math.min(event.currentTarget.clientWidth * 0.46, 540);
    const delta = -dx / scale;
    positionRef.current = clamp(positionRef.current + delta, -0.12, lastSlide + 0.12);
    targetRef.current = positionRef.current;
    dragVelocityRef.current = clamp((delta / dt) * 15, -0.34, 0.34);
    pointerRef.current = { id: event.pointerId, x: event.clientX, time: now };
    setPosition(positionRef.current);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== event.pointerId) return;
    pointerRef.current.id = -1;
    setDragging(false);
    const destination = Math.round(positionRef.current + dragVelocityRef.current * 2.1);
    animateTo(destination, 340);
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const nextTarget = clamp(targetRef.current + delta * 0.0018, 0, lastSlide);
    animateTo(nextTarget, 260);

    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => {
      animateTo(Math.round(targetRef.current), 340);
    }, 90);
  };

  const activeIndex = clamp(Math.round(position), 0, lastSlide);

  return (
    <section className={`carousel-experience ${className}`.trim()}>
      <div className="carousel-ambient" style={{ backgroundImage: `url(${slides[activeIndex]})` }} />
      <div
        className={`carousel-stage ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={onWheel}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') goTo(activeIndex + 1);
          if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        <div className="card-plane">
          {slides.map((image, index) => {
            const offset = index - position;
            const distance = Math.abs(offset);
            const direction = offset < 0 ? -1 : 1;
            const horizontalSpread = distance <= 1
              ? distance * 60
              : 60 + Math.log2(distance) * 24 + Math.max(0, distance - 4) * 2;
            const x = direction * horizontalSpread;
            const rotate = -3 - clamp(offset, -1, 1) * 7.8;
            const scale = Math.max(0.58, 0.92 - distance * 0.035);
            return (
              <article
                key={`${image}-${index}`}
                className="carousel-card"
                style={{
                  '--x': `${x}%`,
                  '--z': `${-distance * 92}px`,
                  '--rotate': `${rotate}deg`,
                  '--scale': scale,
                  zIndex: 100 - Math.round(distance * 10),
                  opacity: distance > 10.2 ? 0 : Math.max(0.24, 1 - Math.max(0, distance - 2) * 0.08),
                } as React.CSSProperties}
                aria-hidden={index !== activeIndex}
              >
                <img src={image} alt="" draggable={false} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
