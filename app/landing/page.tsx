/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';

import gsap from 'gsap';
import Image from 'next/image';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react';
import { Children, cloneElement, createRef, forwardRef, isValidElement, useMemo, useRef, useEffect, useState } from 'react';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, shown };
}

function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, shown } = useReveal();
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity .85s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform .85s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function DotGrid({ opacity = 0.13 }: { opacity?: number }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--color-text-dim)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

function BrowserFrame({ src, url, alt }: { src: string; url: string; alt: string }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px -12px rgba(15,23,42,0.14)' }}>
      <div style={{ background: '#F1F5F9', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
        <span style={{ marginLeft: 16, fontSize: 12, color: 'var(--color-text-dim)' }}>{url}</span>
      </div>
      <Image src={src} alt={alt} width={1400} height={900} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}

const FONT = 'var(--font-primary), -apple-system, BlinkMacSystemFont, sans-serif';
const DARK_EYEBROW = '#64748B';
const DARK_BODY = '#94A3B8';
const DARK_DESC = '#64748B';

function GradientText({ children, animationSpeed = 10 }: { children: React.ReactNode; animationSpeed?: number }) {
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animationDuration = animationSpeed * 1000;

  useAnimationFrame(time => {
    if (lastTimeRef.current === null) { lastTimeRef.current = time; return; }
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += delta;
    const fullCycle = animationDuration * 2;
    const cycleTime = elapsedRef.current % fullCycle;
    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100);
    } else {
      progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
    }
  });

  const backgroundPosition = useTransform(progress, p => `${p}% 50%`);

  return (
    <motion.span
      style={{
        backgroundImage: 'linear-gradient(to right, #F1F5F9, #64748B, #94A3B8, #F1F5F9)',
        backgroundSize: '300% 100%',
        backgroundPosition,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline',
      }}
    >
      {children}
    </motion.span>
  );
}

function MarketPulsePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const item = (delay: number, x: number, y: number, children: React.ReactNode) => ({
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translate(0,0)' : `translate(${x}px,${y}px)`,
      transition: `opacity 0.7s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
    },
    children,
  });

  const stats = [
    { n: '5', label: 'ACTORS WITH SIGNALS' },
    { n: '7', label: 'PULSE SIGNALS' },
    { n: '1', label: 'UPCOMING EVENTS' },
    { n: '5', label: 'WORTH WATCHING' },
  ];

  const actors = [
    { name: 'Phrase (Memsource)', tier: 'Tier 1', type: 'PRODUCT', typeColor: '#16A34A', country: 'CZ, EU' },
    { name: 'RWS', tier: 'Tier 1', type: 'COMMERCIAL', typeColor: '#2563EB', country: 'GB, EU' },
    { name: 'TransPerfect', tier: 'Tier 1', type: 'COMMUNICATIONS', typeColor: '#9333EA', country: 'US, EU' },
  ];

  return (
    <div ref={ref} style={{
      background: '#ffffff',
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 20px 60px -12px rgba(15,23,42,0.14)',
      overflow: 'hidden',
      padding: 24,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div {...item(0, 0, -20, null)} style={{ ...item(0, 0, -20, null).style, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>Market Pulse</div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>Latest updates per tracked player — full history in Timeline.</div>
      </div>

      {/* Filters */}
      <div {...item(80, -30, 0, null)} style={{ ...item(80, -30, 0, null).style, display: 'flex', gap: 8, marginBottom: 20 }}>
        {['All tiers', 'Tier 1', 'Tier 2', 'Worth Watching (5)'].map((f, i) => (
          <span key={f} style={{
            fontSize: 13, fontWeight: i === 0 ? 600 : 400,
            padding: '5px 12px', borderRadius: 20,
            background: i === 0 ? '#0F172A' : 'transparent',
            color: i === 0 ? '#fff' : '#64748B',
            border: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.1)',
          }}>{f}</span>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            ...item(120 + i * 60, 0, 20, null).style,
            padding: '14px 16px',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '.08em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div style={{
        ...item(360, 0, 10, null).style,
        padding: '10px 14px',
        background: '#F8FAFC',
        borderRadius: 8,
        fontSize: 13,
        color: '#64748B',
        marginBottom: 20,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: '#94A3B8' }}>UPCOMING</span>
        <span style={{ background: '#F1F5F9', padding: '2px 10px', borderRadius: 6, fontSize: 12, color: '#0F172A', fontWeight: 500 }}>Oct 1, 2026</span>
        <span>LocWorld52 — major localization industry conference</span>
      </div>

      {/* Tier label */}
      <div style={{ ...item(400, 0, 0, null).style, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 12 }}>
        TIER 1 — FOCUS
      </div>

      {/* Actor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {actors.map((a, i) => (
          <div key={a.name} style={{
            ...item(460 + i * 80, i === 0 ? -20 : i === 2 ? 20 : 0, 20, null).style,
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{a.name}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, color: '#64748B' }}>{a.tier}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{a.country}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: a.typeColor, letterSpacing: '.08em', marginBottom: 6 }}>{a.type}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>Latest update from this player this week.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SwapCard = forwardRef<HTMLDivElement, any>(({ ...rest }, ref) => (
  <div ref={ref} {...rest} style={{
    position: 'absolute', top: '50%', left: '50%',
    borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
    background: '#ffffff', transformStyle: 'preserve-3d',
    willChange: 'transform', backfaceVisibility: 'hidden',
    boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)', overflow: 'hidden',
    padding: 22, fontFamily: "'Inter', sans-serif",
    ...(rest.style ?? {}),
  }} />
));
SwapCard.displayName = 'SwapCard';

function CardSwap({ width = 460, height = 300, delay = 3500, children }: any) {
  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(() => childArr.map(() => createRef<HTMLDivElement>()), [childArr.length]);
  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));
  const intervalRef = useRef<number>();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const total = refs.length;
    const cardDistance = 36;
    const verticalDistance = 28;
    const skewAmount = 5;

    const makeSlot = (i: number) => ({
      x: (i - (total - 1) / 2) * cardDistance,
      y: -i * verticalDistance,
      z: -i * cardDistance * 1.5,
      zIndex: total - i,
    });

    const place = (el: any, slot: any) =>
      gsap.set(el, {
        x: slot.x, y: slot.y, z: slot.z,
        xPercent: -50, yPercent: -50,
        skewY: skewAmount,
        transformOrigin: 'center center',
        zIndex: slot.zIndex,
        force3D: true,
      });

    refs.forEach((r, i) => place(r.current, makeSlot(i)));

    const config = { ease: 'elastic.out(0.6,0.9)', durDrop: 2, durMove: 2, durReturn: 2, promoteOverlap: 0.9, returnDelay: 0.05 };

    const swap = () => {
      if (order.current.length < 2) return;
      const [front, ...rest] = order.current;
      const elFront = refs[front].current;
      const tl = gsap.timeline();

      // front card slides out to the right
      tl.to(elFront, { x: '+=700', duration: config.durDrop, ease: config.ease });

      tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
      rest.forEach((idx, i) => {
        const el = refs[idx].current;
        const slot = makeSlot(i);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease }, `promote+=${i * 0.15}`);
      });

      const backSlot = makeSlot(refs.length - 1);
      tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
      tl.call(() => gsap.set(elFront, { zIndex: backSlot.zIndex }), undefined, 'return');
      tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease }, 'return');
      tl.call(() => { order.current = [...rest, front]; });
    };

    swap();
    intervalRef.current = window.setInterval(swap, delay);
    return () => clearInterval(intervalRef.current);
  }, [delay]);

  const rendered = childArr.map((child: any, i: number) =>
    isValidElement(child) ? cloneElement(child as any, {
      key: i, ref: refs[i],
      style: { width, height, ...((child as any).props.style ?? {}) }
    }) : child
  );

  return (
    <div ref={container} style={{
      position: 'relative',
      width,
      height,
      perspective: 900,
      overflow: 'visible',
      margin: '0 auto',
    }}>
      {rendered}
    </div>
  );
}

function HeroCards() {
  return (
    <div style={{ marginTop: 56, marginBottom: 56 }}>
      <CardSwap width={460} height={300} delay={3500}>
        <SwapCard>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 14 }}>MARKET PULSE</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[{ n: '7', l: 'SIGNALS' }, { n: '5', l: 'ACTORS' }, { n: '5', l: 'WATCH' }].map(s => (
              <div key={s.l} style={{ flex: 1, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 8, color: '#94A3B8', letterSpacing: '.06em', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>What moved this week, per player.</div>
        </SwapCard>

        <SwapCard>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 14 }}>TIMELINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { date: 'Jun 18', cat: 'PRODUCT', color: '#16A34A', actor: '8x8' },
              { date: 'Jun 18', cat: 'COMMERCIAL', color: '#2563EB', actor: 'TransPerfect' },
              { date: 'Jun 17', cat: 'COMMS', color: '#9333EA', actor: 'Welocalize' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ color: '#94A3B8', minWidth: 42 }}>{r.date}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: r.color, letterSpacing: '.05em', minWidth: 78 }}>{r.cat}</span>
                <span style={{ color: '#475569', fontWeight: 500 }}>{r.actor}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginTop: 14 }}>Full history, filterable by everything.</div>
        </SwapCard>

        <SwapCard>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 14 }}>ACTORS</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>DeepL</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 14 }}>Processor · Tier 1 · DE, EU</div>
          <div style={{ display: 'flex', gap: 18 }}>
            {[{ n: '3', l: 'Signals' }, { n: '~900', l: 'Headcount' }].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{s.n}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginTop: 14 }}>Full profile on every player.</div>
        </SwapCard>

        <SwapCard>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 12 }}>REPORTS</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#94A3B8', marginBottom: 6 }}>EXECUTIVE SUMMARY</div>
          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.55 }}>The language services market is bifurcating: cloud-scale AI infrastructure converging with edge deployment...</div>
          <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginTop: 14 }}>Analyst briefings, on demand.</div>
        </SwapCard>
      </CardSwap>
    </div>
  );
}

function ActorProfilePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const anim = (delay: number, y = 16): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
    transition: `opacity 0.7s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
  });

  const boxes = [
    { label: 'BUSINESS MODEL', value: 'SaaS MT — freemium to enterprise' },
    { label: 'AI STRATEGY', value: 'Quality leader vs Google/Microsoft on European pairs. Expanding into writing assistance (DeepL Write).' },
    { label: 'RECENT MOVES', value: 'Nimdzi 100 2026 placed DeepL alongside legacy LSPs for the first time.' },
    { label: 'CORE PRODUCTS', value: 'DeepL Translator · Pro · Write · API' },
    { label: 'CORE TECHNOLOGY', value: 'Proprietary NMT engine · DeepL Write' },
    { label: 'KEY MARKETS', value: 'Enterprise (EU) · Developer API · SMB' },
  ];

  return (
    <div ref={ref} style={{
      background: '#ffffff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 20px 60px -12px rgba(15,23,42,0.14)', overflow: 'hidden',
      padding: 28, fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ ...anim(0), display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#0F172A' }}>DeepL</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Processor · Tier 1 · DE, EU · HQ Cologne, Germany</div>
        </div>
        <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>Active</span>
      </div>

      {/* Description */}
      <div style={{ ...anim(80), fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
        European neural MT specialist. Best-in-class quality for European language pairs. Expanding into enterprise with DeepL Pro and Write.
      </div>

      {/* Stats */}
      <div style={{ ...anim(160), display: 'flex', gap: 32, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {[{ n: '3', l: 'Signals' }, { n: '0', l: 'Critical' }, { n: '~900', l: 'Headcount' }].map(s => (
          <div key={s.l}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Boxes grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {boxes.map((b, i) => (
          <div key={b.label} style={{ ...anim(240 + i * 60), border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 8 }}>{b.label}</div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{b.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketReportPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const anim = (delay: number, y = 16): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
    transition: `opacity 0.7s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
  });

  return (
    <div ref={ref} style={{
      background: '#ffffff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 20px 60px -12px rgba(15,23,42,0.14)', overflow: 'hidden',
      padding: 28, fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header with period selector */}
      <div style={{ ...anim(0), marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>Market Report</div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>Generate an on-demand analyst briefing from updates in any date range.</div>
      </div>

      {/* Period controls */}
      <div style={{ ...anim(80), display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#94A3B8' }}>PERIOD</span>
        <span style={{ fontSize: 12, color: '#475569', background: '#F8FAFC', padding: '4px 10px', borderRadius: 6 }}>01/06/2026</span>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>to</span>
        <span style={{ fontSize: 12, color: '#475569', background: '#F8FAFC', padding: '4px 10px', borderRadius: 6 }}>16/06/2026</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#0F172A', padding: '6px 14px', borderRadius: 8 }}>Regenerate</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#475569', border: '1px solid rgba(0,0,0,0.1)', padding: '6px 14px', borderRadius: 8 }}>Export</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ ...anim(160), fontSize: 11, color: '#CBD5E1', marginBottom: 16 }}>44 signals · 2026-06-01 → 2026-06-16</div>

      {/* Executive summary */}
      <div style={{ ...anim(220), marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 8 }}>EXECUTIVE SUMMARY</div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
          The language services market is bifurcating: cloud-scale AI infrastructure is converging with edge deployment, while traditional LSPs face mounting financial pressure that is forcing a strategic reckoning with AI-driven efficiency.
        </div>
      </div>

      {/* Movements by actor */}
      <div style={{ ...anim(300) }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: '#94A3B8', marginBottom: 12 }}>MOVEMENTS BY ACTOR</div>
        {[
          { name: 'RWS', body: 'Dominated signal volume, driven by H1 FY2026 financial results. Profits rose, yet share price fell and the dividend was cut.' },
          { name: 'TransPerfect', body: 'A single signal: panellist participation in an LBBOnline discussion on building future-fit businesses in the AI era.' },
        ].map((m) => (
          <div key={m.name} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{m.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main style={{ fontFamily: FONT, color: 'var(--color-text-primary)', background: 'var(--color-bg-primary)', overflowX: 'hidden' }}>
      <style>{`
  .btn-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 26px;
    background: #CBD5E1;
    color: #0F172A;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    font-family: inherit;
    overflow: hidden;
    transition: color 0.4s ease;
  }
  .btn-primary::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: #F8FAFC;
    border-radius: 10px;
    transform: scale(0);
    transform-origin: center;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 0;
  }
  .btn-primary:hover::before {
    transform: scale(1);
  }
  .btn-primary:hover {
    color: #0F172A;
  }
  .btn-primary span {
    position: relative;
    z-index: 1;
  }

  .btn-secondary {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 26px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    color: #94A3B8;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 500;
    text-decoration: none;
    font-family: inherit;
    overflow: hidden;
    transition: color 0.4s ease;
  }
  .btn-secondary::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: rgba(255,255,255,0.08);
    border-radius: 10px;
    transform: scale(0);
    transform-origin: center;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 0;
  }
  .btn-secondary:hover::before {
    transform: scale(1);
  }
  .btn-secondary:hover {
    color: #F1F5F9;
    border-color: rgba(255,255,255,0.15);
  }
  .btn-secondary span {
    position: relative;
    z-index: 1;
  }

  .btn-cta {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 15px 30px;
    background: #0F172A;
    color: #fff;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    font-family: inherit;
    overflow: hidden;
    transition: color 0.4s ease;
  }
  .btn-cta::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: #1E293B;
    border-radius: 10px;
    transform: scale(0);
    transform-origin: center;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 0;
  }
  .btn-cta:hover::before {
    transform: scale(1);
  }
  .btn-cta span {
    position: relative;
    z-index: 1;
  }
`}</style>
      <Hero />
      <StickyStack />
      <WhoItsFor />
      <ClosingCTA />
      <Footer />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section style={{ position: 'relative', background: 'var(--color-sidebar-from)', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, #000 40%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, #000 40%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 900,
        margin: '0 auto',
        padding: '140px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <Reveal>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 'var(--font-weight-semibold)', letterSpacing: '.1em', textTransform: 'uppercase', color: DARK_EYEBROW, marginBottom: 32 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-dim)' }} />
            Market Intelligence
          </span>
        </Reveal>

        <Reveal delay={60}>
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.0, letterSpacing: '-.04em', color: '#F1F5F9', margin: '0 0 6px' }}>
            Your industry is moving.
          </h1>
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.0, letterSpacing: '-.04em', margin: '0 0 36px' }}>
            <GradientText>Know where, and why.</GradientText>
          </h1>
        </Reveal>

        <HeroCards />

        <Reveal delay={140}>
          <p style={{ fontSize: 'clamp(17px, 2.2vw, 20px)', lineHeight: 1.65, color: DARK_BODY, maxWidth: 900, margin: '0 auto', fontWeight: 'var(--font-weight-regular)' }}>
            Market Radar tracks every player in your field, reads what they publish and announce, puts it in context with AI, and tells you what is worth your attention today.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
            <a href="https://radar-market.vercel.app" target="_blank" rel="noreferrer" className="btn-primary">
              <span>Live demo (Language Services example)</span>
            </a>
            <a href="#cta" className="btn-secondary">
              <span>Set this up for your market</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sticky feature stack
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    id: 'problem',
    bg: '#162032',
    dark: true,
    eyebrow: 'The loop everyone knows',
    heading: 'Market intelligence is still a patchwork.',
    body: 'A newsletter here. A Google Alert there. A message from someone who caught something. It works until the market gets busy, the team gets stretched, or the field gets wider.',
    aside: 'problem-and-pipeline',
  },
  {
    id: 'pulse',
    bg: '#F8FAFC',
    dark: false,
    eyebrow: 'Market Pulse',
    heading: 'What moved today, across your field.',
    body: 'A live feed of updates per player, updated daily when there is activity. Filter by tier, read by update type, flag what warrants a closer look. Nothing slips through because nobody had time to check.',
    aside: 'animated-pulse',
  },
  {
    id: 'actors',
    bg: 'var(--color-bg-primary)',
    dark: false,
    eyebrow: 'Player profiles',
    heading: 'Every player in your field, fully mapped.',
    body: 'Business model, AI strategy, recent moves, core products, key markets, and every update linked to them. When you need a deeper view, generate a Strategic Analysis report per player: SWOT, strategy assessment, product map, market opportunities, and key risks.',
    aside: 'animated-actor',
  },
  {
    id: 'reports',
    bg: '#F8FAFC',
    dark: false,
    eyebrow: 'Market Reports',
    heading: 'A full briefing, built from real updates.',
    body: 'Pick a date range. Get a structured report: executive summary, movements by player, emerging patterns, and what to watch next quarter. Grounded in the actual updates in the system. Download it, share it with your team or your client.',
    aside: 'animated-report',
  },
];

function StickyStack() {
  return (
    <div id="features" style={{ position: 'relative' }}>
      {FEATURES.map((f, i) => (
        <div
          key={f.id}
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10 + i,
            background: f.bg,
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'flex-start',
            padding: '80px 24px 120px',
            borderRadius: i > 0 ? '20px 20px 0 0' : 0,
            boxShadow: i > 0 ? '0 -8px 48px rgba(0,0,0,0.07)' : 'none',
            marginTop: i > 0 ? -20 : 0,
          }}
        >
          <div style={{ maxWidth: 980, margin: '0 auto', width: '100%' }}>
            <Reveal>
              <span style={{ fontSize: 12, fontWeight: 'var(--font-weight-semibold)', letterSpacing: '.1em', textTransform: 'uppercase', color: f.dark ? DARK_EYEBROW : 'var(--color-text-dim)', display: 'block', marginBottom: 20 }}>
                {f.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={60}>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-.03em', lineHeight: 1.08, margin: '0 0 24px', maxWidth: 580, color: f.dark ? '#F1F5F9' : 'var(--color-text-primary)' }}>
                {f.heading}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: f.dark ? DARK_BODY : 'var(--color-text-muted)', maxWidth: 540, margin: '0 0 48px' }}>
                {f.body}
              </p>
            </Reveal>

            {f.aside === 'problem-and-pipeline' && (
              <div style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: 48 }}>
                  A system that runs so you don&apos;t have to.
                </span>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 16, left: 0, right: 0, height: 1,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.12) 80%, transparent 100%)',
                  }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative', zIndex: 1 }}>
                    {[
                      { n: '01', title: 'Watch', body: 'The system ingests updates daily across every player and topic in the configured domain. No manual curation. No missed sources.' },
                      { n: '02', title: 'Enrich', body: 'Each update is automatically categorized, scored by relevance, and connected to the players and topics it affects. You get context, not just raw information.' },
                      { n: '03', title: 'Surface', body: 'Updates rise to a live pulse, structured player profiles, and on-demand reports. You read what matters, already in context.' },
                    ].map((step, i) => (
                      <Reveal key={step.n} delay={i * 150}>
                        <div style={{ padding: '0 32px 0 0' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 24, position: 'relative', zIndex: 1 }}>
                            {i + 1}
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: '#F1F5F9', letterSpacing: '-.02em', marginBottom: 12 }}>{step.title}</div>
                          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#94A3B8', margin: 0 }}>{step.body}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {f.aside === 'screenshot-pulse' && (
              <Reveal delay={160}>
                <BrowserFrame src="/landing/screenshot-pulse.png" url="radar-market.vercel.app" alt="Market Pulse" />
              </Reveal>
            )}
            {f.aside === 'animated-pulse' && (
              <Reveal delay={160}>
                <MarketPulsePreview />
              </Reveal>
            )}
            {f.aside === 'animated-actor' && (
              <Reveal delay={160}><ActorProfilePreview /></Reveal>
            )}
            {f.aside === 'animated-report' && (
              <Reveal delay={160}><MarketReportPreview /></Reveal>
            )}
            {f.aside === 'screenshot-actor' && (
              <Reveal delay={160}>
                <BrowserFrame src="/landing/screenshot-compare.png" url="radar-market.vercel.app/actors/compare" alt="Compare actors" />
              </Reveal>
            )}
            {f.aside === 'screenshot-report' && (
              <Reveal delay={160}>
                <BrowserFrame src="/landing/screenshot-report.png" url="radar-market.vercel.app/reports" alt="Market Report" />
              </Reveal>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Who it's for
// ---------------------------------------------------------------------------
const AUDIENCE = [
  { role: 'Product analysts', desc: 'Track a competitive field without managing a dozen sources by hand.' },
  { role: 'Founders', desc: 'Know where your market is moving before it moves on you.' },
  { role: 'Investors', desc: "Read a sector's signal density at a glance. Configure any domain in minutes." },
  { role: 'Consultants', desc: 'Stand up a credible, live market view — and generate a briefing for any client.' },
];

function WhoItsFor() {
  return (
    <section style={{ background: 'var(--color-sidebar-from)', position: 'relative', overflow: 'hidden', padding: '100px 24px', borderRadius: '20px 20px 0 0', zIndex: 60, boxShadow: '0 -8px 48px rgba(0,0,0,0.10)' }}>
      <DotGrid opacity={0.09} />
      <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <span style={{ fontSize: 12, fontWeight: 'var(--font-weight-semibold)', letterSpacing: '.1em', textTransform: 'uppercase', color: DARK_EYEBROW, display: 'block', marginBottom: 56 }}>
            Who it&rsquo;s for
          </span>
        </Reveal>
        {AUDIENCE.map((a, i) => (
          <Reveal key={a.role} delay={i * 70}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(16px, 4vw, 64px)', padding: '28px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 'clamp(20px, 2.8vw, 30px)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-.025em', color: '#F1F5F9', minWidth: 'clamp(180px, 24vw, 280px)', flexShrink: 0 }}>
                {a.role}
              </span>
              <span style={{ fontSize: 17, color: DARK_DESC, lineHeight: 1.55 }}>{a.desc}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Closing CTA
// ---------------------------------------------------------------------------
function ClosingCTA() {
  return (
    <section id="cta" style={{ padding: '120px 24px', textAlign: 'center', background: 'var(--color-bg-primary)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
            This is one example. Your market is next.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p style={{ fontSize: 18, color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: 44 }}>
            The demo runs on Language Services and Language AI, configured as a working example of what the system can do. Market Radar can be set up for any industry with enough public activity: fintech, healthtech, SaaS, defense, and beyond.{' '}
            <span>Interested?</span>
            <br />
            <a href="mailto:armisen.gi@gmail.com" style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'none' }}>
              Get in touch
            </a>
          </p>
        </Reveal>
        <Reveal delay={160}>
          <a href="https://radar-market.vercel.app" target="_blank" rel="noreferrer" className="btn-cta">
            <span>Open the demo →</span>
          </a>
          <p style={{ fontSize: 14, color: 'var(--color-text-dim)', lineHeight: 1.65, marginTop: 40, marginBottom: 0 }}>
            Built by{' '}
            <a href="https://linkedin.com/in/giarmisen" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'none' }}>
              Georgina Armisen
            </a>
            , Senior Product Designer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px', fontSize: 13, color: 'var(--color-text-dim)', borderTop: '1px solid var(--color-card-border)', flexWrap: 'wrap', gap: 12, background: 'var(--color-bg-primary)' }}>
      <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', letterSpacing: '-.01em' }}>Radar.</span>
      <a href="https://radar-market.vercel.app" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
        radar-market.vercel.app →
      </a>
    </footer>
  );
}
