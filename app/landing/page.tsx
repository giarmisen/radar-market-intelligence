'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

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
          <circle cx="1" cy="1" r="1" fill="#94A3B8" />
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
        <span style={{ marginLeft: 16, fontSize: 12, color: '#94A3B8' }}>{url}</span>
      </div>
      <Image src={src} alt={alt} width={1400} height={900} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function LandingPage() {
  return (
    <main style={{ fontFamily: FONT, color: '#0F172A', background: '#fff', overflowX: 'hidden' }}>
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
    <section style={{ position: 'relative', background: '#0F172A', overflow: 'hidden' }}>
      <DotGrid opacity={0.12} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '140px 24px 0', textAlign: 'center' }}>
        <Reveal>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748B', marginBottom: 32 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#94A3B8' }} />
            Market Radar
          </span>
        </Reveal>

        <Reveal delay={60}>
          <h1 style={{ fontSize: 'clamp(52px, 9vw, 96px)', fontWeight: 600, lineHeight: 1.0, letterSpacing: '-.04em', color: '#F1F5F9', margin: '0 0 6px' }}>
            Your industry is moving.
          </h1>
          <h1 style={{ fontSize: 'clamp(52px, 9vw, 96px)', fontWeight: 600, lineHeight: 1.0, letterSpacing: '-.04em', color: '#64748B', margin: '0 0 36px' }}>
            Know where, and why.
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p style={{ fontSize: 'clamp(17px, 2.2vw, 20px)', lineHeight: 1.65, color: '#64748B', maxWidth: 520, margin: '0 auto 52px', fontWeight: 400 }}>
            Market Radar tracks every player in your field, reads what they publish and announce, puts it in context with AI, and tells you what is worth your attention today.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 80 }}>
            <a href="https://radar-market.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', background: '#F8FAFC', color: '#0F172A', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
              Live demo (Language Services example)
            </a>
            <a href="#cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748B', borderRadius: 10, fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
              Set this up for your market
            </a>
          </div>
        </Reveal>

        {/* Browser frame hero */}
        <Reveal delay={280}>
          <div style={{ borderRadius: '14px 14px 0 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)' }}>
            <div style={{ background: '#1E293B', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', display: 'inline-block', flexShrink: 0 }} />
              <div style={{ marginLeft: 16, flex: 1, background: '#0F172A', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#64748B', textAlign: 'left' }}>
                radar-market.vercel.app
              </div>
            </div>
            <Image src="/landing/screenshot-pulse.png" alt="Market Pulse — señales del mercado por actor" width={1400} height={900} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </Reveal>
      </div>

      <div style={{ paddingBottom: 80 }} />
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
    aside: 'screenshot-pulse',
  },
  {
    id: 'actors',
    bg: '#ffffff',
    dark: false,
    eyebrow: 'Player profiles',
    heading: 'Every player in your field, fully mapped.',
    body: 'Business model, AI strategy, recent moves, core products, key markets, and every update linked to them. When you need a deeper view, generate a Strategic Analysis report per player: SWOT, strategy assessment, product map, market opportunities, and key risks.',
    aside: 'screenshot-actor',
  },
  {
    id: 'reports',
    bg: '#F8FAFC',
    dark: false,
    eyebrow: 'Market Reports',
    heading: 'A full briefing, built from real updates.',
    body: 'Pick a date range. Get a structured report: executive summary, movements by player, emerging patterns, and what to watch next quarter. Grounded in the actual updates in the system. Download it, share it with your team or your client.',
    aside: 'screenshot-report',
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
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: f.dark ? '#64748B' : '#94A3B8', display: 'block', marginBottom: 20 }}>
                {f.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={60}>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.08, margin: '0 0 24px', maxWidth: 580, color: f.dark ? '#F1F5F9' : '#0F172A' }}>
                {f.heading}
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: f.dark ? '#64748B' : '#64748B', maxWidth: 540, margin: '0 0 48px' }}>
                {f.body}
              </p>
            </Reveal>

            {f.aside === 'problem-and-pipeline' && (
              <div style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B', marginBottom: 40, display: 'block' }}>
                  A system that runs so you don&apos;t have to.
                </span>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.12) 80%, transparent 100%)',
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative', zIndex: 1 }}>
                    {[
                      { n: '01', title: 'Watch', body: 'The system ingests updates daily across every player and topic in the configured domain. No manual curation. No missed sources.' },
                      { n: '02', title: 'Enrich', body: 'Each update is automatically categorized, scored by relevance, and connected to the players and topics it affects. You get context, not just raw information.' },
                      { n: '03', title: 'Surface', body: 'Updates rise to a live pulse, structured player profiles, and on-demand reports. You read what matters, already in context.' },
                    ].map((step, si) => (
                      <Reveal key={step.n} delay={si * 100}>
                        <div style={{ padding: '0 32px 0 0' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: '#0F172A',
                              border: '1px solid rgba(255,255,255,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#64748B',
                            }}
                          >
                            {step.n}
                          </div>
                          <div style={{ marginTop: 24, fontSize: 22, fontWeight: 600, color: '#F1F5F9', letterSpacing: '-0.02em', marginBottom: 12 }}>
                            {step.title}
                          </div>
                          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#64748B', margin: 0 }}>
                            {step.body}
                          </p>
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
    <section style={{ background: '#0F172A', position: 'relative', overflow: 'hidden', padding: '100px 24px', borderRadius: '20px 20px 0 0', zIndex: 60, boxShadow: '0 -8px 48px rgba(0,0,0,0.10)' }}>
      <DotGrid opacity={0.09} />
      <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: 56 }}>
            Who it&rsquo;s for
          </span>
        </Reveal>
        {AUDIENCE.map((a, i) => (
          <Reveal key={a.role} delay={i * 70}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(16px, 4vw, 64px)', padding: '28px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 'clamp(20px, 2.8vw, 30px)', fontWeight: 600, letterSpacing: '-.025em', color: '#F1F5F9', minWidth: 'clamp(180px, 24vw, 280px)', flexShrink: 0 }}>
                {a.role}
              </span>
              <span style={{ fontSize: 17, color: '#64748B', lineHeight: 1.55 }}>{a.desc}</span>
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
    <section id="cta" style={{ padding: '120px 24px', textAlign: 'center', background: '#fff' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
            This is one example. Your market is next.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.65, marginBottom: 44 }}>
            The demo runs on Language Services and Language AI, configured as a working example of what the system can do. Market Radar can be set up for any industry with enough public activity: fintech, healthtech, SaaS, defense, and beyond.{' '}
            <span>Interested?</span>
            <br />
            <a href="mailto:armisen.gi@gmail.com" style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
              Get in touch
            </a>
          </p>
        </Reveal>
        <Reveal delay={160}>
          <a href="https://radar-market.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', background: '#0F172A', color: '#fff', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
            Open the demo →
          </a>
          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.65, marginTop: 40, marginBottom: 0 }}>
            Built by{' '}
            <a href="https://linkedin.com/in/giarmisen" target="_blank" rel="noreferrer" style={{ color: '#64748B', fontWeight: 600, textDecoration: 'none' }}>
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
    <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px', fontSize: 13, color: '#94A3B8', borderTop: '1px solid rgba(0,0,0,0.07)', flexWrap: 'wrap', gap: 12, background: '#fff' }}>
      <span style={{ fontWeight: 600, color: '#0F172A', letterSpacing: '-.01em' }}>Radar.</span>
      <a href="https://radar-market.vercel.app" target="_blank" rel="noreferrer" style={{ color: '#64748B', textDecoration: 'none' }}>
        radar-market.vercel.app →
      </a>
    </footer>
  );
}
