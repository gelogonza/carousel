'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const slides = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=1600&q=88',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=88',
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function Carousel() {
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const velocityRef = useRef(0);
  const pointerRef = useRef({ id: -1, x: 0, time: 0 });
  const frameRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    const distance = targetRef.current - positionRef.current;
    velocityRef.current = velocityRef.current * 0.78 + distance * 0.14;
    positionRef.current += velocityRef.current;

    if (Math.abs(distance) < 0.0008 && Math.abs(velocityRef.current) < 0.0008) {
      positionRef.current = targetRef.current;
      velocityRef.current = 0;
      setPosition(positionRef.current);
      frameRef.current = null;
      return;
    }

    setPosition(positionRef.current);
    frameRef.current = requestAnimationFrame(animate);
  }, []);

  const startAnimation = useCallback(() => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const goTo = useCallback((index: number) => {
    targetRef.current = clamp(index, 0, slides.length - 1);
    startAnimation();
  }, [startAnimation]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerRef.current = { id: event.pointerId, x: event.clientX, time: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    velocityRef.current = 0;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== event.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - pointerRef.current.x;
    const dt = Math.max(now - pointerRef.current.time, 1);
    const scale = Math.min(window.innerWidth * 0.46, 540);
    const delta = -dx / scale;
    positionRef.current = clamp(positionRef.current + delta, -0.2, slides.length - 0.8);
    targetRef.current = positionRef.current;
    velocityRef.current = clamp((delta / dt) * 15, -0.34, 0.34);
    pointerRef.current = { id: event.pointerId, x: event.clientX, time: now };
    setPosition(positionRef.current);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== event.pointerId) return;
    pointerRef.current.id = -1;
    setDragging(false);
    targetRef.current = clamp(Math.round(positionRef.current + velocityRef.current * 2.4), 0, slides.length - 1);
    startAnimation();
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    targetRef.current = clamp(targetRef.current + delta * 0.0018, 0, slides.length - 1);
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => {
      targetRef.current = Math.round(targetRef.current);
      startAnimation();
    }, 90);
    startAnimation();
  };

  const activeIndex = clamp(Math.round(position), 0, slides.length - 1);

  return (
    <main className="experience">
      <div className="ambient" style={{ backgroundImage: `url(${slides[activeIndex]})` }} />
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
        aria-label="Image carousel"
        tabIndex={0}
      >
        <div className="card-plane">
          {slides.map((image, index) => {
            const offset = index - position;
            const distance = Math.abs(offset);
            const direction = offset < 0 ? -1 : 1;
            const x = offset * 38 + direction * Math.max(0, distance - 1) * 5;
            const rotate = offset === 0 ? 0 : direction * -8;
            const scale = Math.max(0.62, 1 - distance * 0.08);
            return (
              <article
                key={image}
                className="carousel-card"
                style={{
                  '--x': `${x}%`,
                  '--z': `${-distance * 120}px`,
                  '--rotate': `${rotate}deg`,
                  '--scale': scale,
                  zIndex: 100 - Math.round(distance * 10),
                  opacity: distance > 4.2 ? 0 : Math.max(0.16, 1 - Math.max(0, distance - 2.6) * 0.3),
                } as React.CSSProperties}
                aria-hidden={index !== activeIndex}
              >
                <img src={image} alt="" draggable={false} />
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
