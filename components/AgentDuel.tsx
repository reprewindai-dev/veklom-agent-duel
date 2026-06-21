'use client'
/**
 * AgentDuel — Main game component
 *
 * Crash loop with:
 * - Exponential multiplier curve rendered on canvas
 * - 9-node routing strip (Vector North vs Quiet Switch)
 * - Eject mechanic with near-miss FOMO psychology
 * - Matrix Fracture jackpot at 5×+
 * - Web Audio procedural SFX
 * - x402 session gate (calls /api/session before first game)
 * - Wallet connect via WalletConnect component
 *
 * See AGENT_NOTES.md for full architecture notes.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import WalletConnect from './WalletConnect'

const NODES = [
  { id: 1, label: 'Open',   hint: 'Pressure favors late timing.' },
  { id: 2, label: 'Split',  hint: 'Clean path but noisy finish.' },
  { id: 3, label: 'Feint',  hint: 'Pressure favors late timing.' },
  { id: 4, label: 'Commit', hint: 'Cross-lane conflict detected.' },
  { id: 5, label: 'Slip',   hint: 'Pressure favors late timing.' },
  { id: 6, label: 'Fork',   hint: 'Upper route lights first.' },
  { id: 7, label: 'Trace',  hint: 'Lower route feels safer.' },
  { id: 8, label: 'Pivot',  hint: 'Pressure favors late timing.' },
  { id: 9, label: 'Lock',   hint: 'Lower route feels safer.' },
]

const WAGER_OPTIONS = [10, 25, 50, 100]

type Phase = 'idle' | 'running' | 'ejected' | 'crashed' | 'jackpot'
type Agent = 'vector' | 'switch'

function useCrashAudio() {
  const ctx = useRef<AudioContext | null>(null)

  function getCtx() {
    if (!ctx.current) ctx.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)()
    return ctx.current
  }

  function playClick() {
    try {
      const c = getCtx()
      const o = c.createOscillator(); const g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.frequency.value = 440 + Math.random() * 200
      g.gain.setValueAtTime(0.05, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04)
      o.start(); o.stop(c.currentTime + 0.04)
    } catch {}
  }

  function playEject() {
    try {
      const c = getCtx()
      ;[0, 150, 300].forEach(delay => {
        const o = c.createOscillator(); const g = c.createGain()
        o.connect(g); g.connect(c.destination)
        o.type = 'sine'
        o.frequency.value = 523 + delay
        g.gain.setValueAtTime(0.12, c.currentTime + delay/1000)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay/1000 + 0.25)
        o.start(c.currentTime + delay/1000)
        o.stop(c.currentTime + delay/1000 + 0.25)
      })
    } catch {}
  }

  function playCrash() {
    try {
      const c = getCtx()
      const buf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/d.length, 2)
      const s = c.createBufferSource(); const g = c.createGain()
      s.buffer = buf; s.connect(g); g.connect(c.destination)
      g.gain.value = 0.15
      s.start()
    } catch {}
  }

  function playJackpot() {
    try {
      const c = getCtx()
      const freqs = [523, 659, 784, 1047]
      freqs.forEach((f, i) => {
        const o = c.createOscillator(); const g = c.createGain()
        o.connect(g); g.connect(c.destination)
        o.frequency.value = f; o.type = 'sine'
        g.gain.setValueAtTime(0.12, c.currentTime + i * 0.12)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.4)
        o.start(c.currentTime + i * 0.12)
        o.stop(c.currentTime + i * 0.12 + 0.4)
      })
    } catch {}
  }

  return { playClick, playEject, playCrash, playJackpot }
}

function crashPoint(): number {
  // Pareto distribution with 3% instant floor — mirrors real crash games
  const r = Math.random()
  if (r < 0.03) return 1.00
  return Math.max(1.01, 1 / (1 - r * 0.97))
}

export default function AgentDuel() {
  const [agent, setAgent] = useState<Agent>('vector')
  const [wager, setWager] = useState(25)
  const [bankroll, setBankroll] = useState(500)
  const [round, setRound] = useState(1)
  const [streak, setStreak] = useState(0)
  const [winRate, setWinRate] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)
  const [wins, setWins] = useState(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [multiplier, setMultiplier] = useState(1.00)
  const [targetCrash, setTargetCrash] = useState(1.0)
  const [activeNode, setActiveNode] = useState(0)
  const [resultMsg, setResultMsg] = useState('')
  const [shake, setShake] = useState(false)
  const [showJackpot, setShowJackpot] = useState(false)
  const [feed, setFeed] = useState<{id:number; text:string; color:string}[]>([])
  const [sessionGranted, setSessionGranted] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const crashPointRef = useRef<number>(1)
  const multiplierRef = useRef<number>(1)
  const audio = useCrashAudio()

  // Draw multiplier curve on canvas
  const drawCanvas = useCallback((mult: number, crashed: boolean, ejected: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, H * i/4); ctx.lineTo(W, H * i/4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(W * i/4, 0); ctx.lineTo(W * i/4, H); ctx.stroke()
    }

    // Multiplier label
    const color = crashed ? '#ef4444' : ejected ? '#22c55e' : mult > 3 ? '#f59e0b' : mult > 2 ? '#e0a800' : '#00c2e0'
    ctx.font = `bold ${Math.min(64, Math.max(32, H * 0.22))}px 'Cabinet Grotesk', sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      crashed ? 'HIJACKED' : `${mult.toFixed(2)}×`,
      W / 2, H / 2 - 10
    )

    // Sub label
    ctx.font = `500 14px 'Satoshi', sans-serif`
    ctx.fillStyle = crashed ? '#ef4444' : ejected ? '#22c55e' : 'rgba(255,255,255,0.4)'
    ctx.fillText(
      crashed ? 'Route collapsed' : ejected ? 'Exit secured' : 'Route active — hold or eject',
      W / 2, H / 2 + 40
    )

    // Curve
    const points = Math.floor(mult * 20)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.shadowBlur = 12
    ctx.shadowColor = color
    for (let i = 0; i <= points; i++) {
      const x = (i / Math.max(points, 1)) * (W * 0.85) + W * 0.05
      const m = Math.pow(Math.E, (i / Math.max(points, 1)) * 0.35 * mult)
      const y = H - (H * 0.1) - ((m - 1) / (mult - 1 || 1)) * (H * 0.7)
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  }, [])

  // Main crash loop
  useEffect(() => {
    if (phase !== 'running') return
    startTimeRef.current = performance.now()
    crashPointRef.current = targetCrash

    function tick(now: number) {
      const elapsed = (now - startTimeRef.current) / 1000
      const m = Math.pow(Math.E, elapsed * 0.35)
      multiplierRef.current = m
      setMultiplier(parseFloat(m.toFixed(2)))

      // Activate nodes as multiplier climbs
      const nodeIdx = Math.min(Math.floor((m - 1) * 3), 8)
      setActiveNode(nodeIdx)

      // Danger shake at 3×+
      if (m > 3 && Math.random() < 0.015) {
        setShake(true)
        setTimeout(() => setShake(false), 200)
      }

      // Click tick audio
      if (Math.random() < 0.04) audio.playClick()

      // Jackpot check at 5×+
      if (m >= 5 && Math.random() < 0.004) {
        setPhase('jackpot')
        setShowJackpot(true)
        audio.playJackpot()
        cancelAnimationFrame(rafRef.current)
        return
      }

      // Crash check
      if (m >= crashPointRef.current) {
        setPhase('crashed')
        audio.playCrash()
        drawCanvas(m, true, false)
        setBankroll(prev => prev - 0) // wager already deducted on start
        setStreak(0)
        addFeed(`Round ${round} — ${agent === 'vector' ? 'Vector North' : 'Quiet Switch'} hijacked at ${m.toFixed(2)}×`, '#ef4444')
        setResultMsg(`Hijacked at ${m.toFixed(2)}× — lost ${wager}`)
        setTotalRounds(r => r + 1)
        return
      }

      drawCanvas(m, false, false)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, targetCrash, agent, wager, round, drawCanvas, audio])

  function addFeed(text: string, color: string) {
    setFeed(prev => [{ id: Date.now(), text, color }, ...prev].slice(0, 10))
  }

  async function requestSession() {
    setSessionLoading(true)
    try {
      const res = await fetch('/api/session')
      if (res.status === 402) {
        // In real integration: use x402-fetch to handle payment automatically
        // For now, grant session in demo mode
        console.log('[x402] Payment required — demo mode: granting session')
        setSessionGranted(true)
      } else if (res.ok) {
        setSessionGranted(true)
      }
    } catch {
      setSessionGranted(true) // fallback for demo
    } finally {
      setSessionLoading(false)
    }
  }

  function initiate() {
    if (!sessionGranted) { requestSession(); return }
    if (bankroll < wager) { setResultMsg('Insufficient bankroll'); return }
    if (phase === 'running') return
    setBankroll(prev => prev - wager)
    setTargetCrash(crashPoint())
    setMultiplier(1.00)
    setActiveNode(0)
    setResultMsg('')
    setPhase('running')
  }

  function eject() {
    if (phase !== 'running') return
    cancelAnimationFrame(rafRef.current)
    const m = multiplierRef.current
    const payout = Math.floor(wager * m)
    setBankroll(prev => prev + payout)
    setPhase('ejected')
    audio.playEject()
    const net = payout - wager
    const didWin = net > 0
    setWins(w => w + (didWin ? 1 : 0))
    setTotalRounds(r => { const nr = r + 1; setWinRate(Math.round(((wins + (didWin ? 1 : 0)) / nr) * 100)); return nr })
    setStreak(s => didWin ? s + 1 : 0)
    addFeed(
      `Round ${round} — Ejected at ${m.toFixed(2)}× · ${net >= 0 ? '+' : ''}${net}`,
      didWin ? '#22c55e' : '#f59e0b'
    )
    setResultMsg(`Ejected at ${m.toFixed(2)}× · Payout: ${payout} · Net: ${net >= 0 ? '+' : ''}${net}`)
    drawCanvas(m, false, true)
    setRound(r => r + 1)
  }

  function collectJackpot() {
    const m = multiplierRef.current
    const payout = Math.floor(wager * m * 5)
    setBankroll(prev => prev + payout)
    setShowJackpot(false)
    setPhase('ejected')
    addFeed(`⚡ MATRIX FRACTURE — Round ${round} at ${m.toFixed(2)}× · Payout: ${payout}`, '#f59e0b')
    setResultMsg(`MATRIX FRACTURE! Payout: ${payout}`)
    setRound(r => r + 1)
    setStreak(s => s + 1)
    drawCanvas(m, false, true)
  }

  function reset() {
    cancelAnimationFrame(rafRef.current)
    setBankroll(500); setRound(1); setStreak(0); setWinRate(0)
    setTotalRounds(0); setWins(0); setPhase('idle')
    setMultiplier(1.00); setActiveNode(0); setResultMsg('')
    setFeed([]); setShowJackpot(false)
    const canvas = canvasRef.current
    if (canvas) { const ctx = canvas.getContext('2d'); ctx?.clearRect(0,0,canvas.width,canvas.height) }
  }

  const agentColor = agent === 'vector' ? '#00c2e0' : '#a855f7'

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: '#050609', minHeight: '100dvh', color: '#e8eaf0' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(12,14,20,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Veklom">
            <rect width="28" height="28" rx="6" fill="#00c2e0" fillOpacity="0.12"/>
            <path d="M7 8 L14 20 L21 8" stroke="#00c2e0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="14" cy="14" r="2" fill="#a855f7"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Veklom Agent Duel</span>
          <span style={{
            fontSize: '0.7rem', padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            background: 'rgba(0,194,224,0.1)',
            border: '1px solid rgba(0,194,224,0.25)',
            color: '#00c2e0', fontWeight: 600
          }}>BASE</span>
        </div>
        <WalletConnect />
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Canvas arena */}
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid ${agentColor}33`,
          background: '#0c0e14',
          marginBottom: '1.25rem',
          animation: shake ? 'shake 0.15s ease' : 'none'
        }}>
          <style>{`@keyframes shake{0%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}50%{transform:translate(3px,-2px)}75%{transform:translate(-2px,2px)}100%{transform:translate(0,0)}}`}</style>
          <canvas
            ref={canvasRef}
            width={820}
            height={240}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          {phase === 'idle' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '0.5rem',
              background: 'rgba(5,6,9,0.6)', backdropFilter: 'blur(4px)'
            }}>
              <span style={{ fontSize: '2.5rem' }}>⚡</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>Select an agent and initiate the route</span>
            </div>
          )}
        </div>

        {/* Jackpot overlay */}
        {showJackpot && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: '#0c0e14',
              border: '1px solid #f59e0b',
              borderRadius: '16px',
              padding: '2.5rem',
              textAlign: 'center',
              maxWidth: '380px',
              boxShadow: '0 0 60px rgba(245,158,11,0.3)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem', fontWeight: 800,
                color: '#f59e0b', marginBottom: '0.5rem'
              }}>MATRIX FRACTURE</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
                The routing grid collapsed into a resonance loop.<br />
                Your position survived the cascade.<br />
                <strong style={{ color: '#f59e0b' }}>5× JACKPOT ACTIVE</strong>
              </p>
              <button
                onClick={collectJackpot}
                style={{
                  width: '100%', padding: '0.875rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: '#000', fontWeight: 800, fontSize: '1rem',
                  border: 'none', cursor: 'pointer'
                }}
              >
                COLLECT JACKPOT
              </button>
            </div>
          </div>
        )}

        {/* Node strip */}
        <div style={{
          display: 'flex', gap: '0.4rem', marginBottom: '1.25rem',
          overflowX: 'auto', paddingBottom: '0.25rem'
        }}>
          {NODES.map((node, i) => (
            <div key={node.id} style={{
              flex: '0 0 auto',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: `1px solid ${i <= activeNode && phase === 'running' ? agentColor : 'rgba(255,255,255,0.08)'}`,
              background: i <= activeNode && phase === 'running' ? `${agentColor}18` : 'transparent',
              transition: 'all 0.2s ease',
              minWidth: '64px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.15rem' }}>Node {node.id}</div>
              <div style={{
                fontSize: '0.78rem', fontWeight: 600,
                color: i <= activeNode && phase === 'running' ? agentColor : 'rgba(255,255,255,0.5)'
              }}>{node.label}</div>
            </div>
          ))}
        </div>

        {/* Agent selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {(['vector', 'switch'] as Agent[]).map(a => (
            <button
              key={a}
              onClick={() => { if (phase !== 'running') { setAgent(a); audio.playClick() } }}
              style={{
                padding: '1rem',
                borderRadius: '10px',
                border: `1.5px solid ${
                  agent === a
                    ? (a === 'vector' ? '#00c2e0' : '#a855f7')
                    : 'rgba(255,255,255,0.08)'
                }`,
                background: agent === a
                  ? `${a === 'vector' ? '#00c2e0' : '#a855f7'}12`
                  : 'rgba(255,255,255,0.02)',
                textAlign: 'left',
                cursor: phase === 'running' ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
                opacity: phase === 'running' && agent !== a ? 0.4 : 1
              }}
            >
              <div style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
                color: a === 'vector' ? '#00c2e0' : '#a855f7',
                marginBottom: '0.25rem'
              }}>{a === 'vector' ? 'A' : 'B'}</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                {a === 'vector' ? 'Vector North' : 'Quiet Switch'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                {a === 'vector' ? 'Aggressive branch sprinter' : 'Calm redirect specialist'}
              </div>
            </button>
          ))}
        </div>

        {/* Wager selector + controls */}
        <div style={{
          display: 'flex', gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '1rem'
        }}>
          {WAGER_OPTIONS.map(w => (
            <button
              key={w}
              onClick={() => { if (phase !== 'running') { setWager(w); audio.playClick() } }}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '9999px',
                border: `1px solid ${wager === w ? agentColor : 'rgba(255,255,255,0.12)'}`,
                background: wager === w ? `${agentColor}18` : 'transparent',
                color: wager === w ? agentColor : 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem', fontWeight: 600,
                cursor: phase === 'running' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >+{w}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem'
              }}
            >Reset</button>
            {phase === 'running' ? (
              <button
                onClick={eject}
                style={{
                  padding: '0.5rem 1.5rem', borderRadius: '8px',
                  background: '#22c55e', color: '#000',
                  fontWeight: 800, fontSize: '0.95rem', border: 'none',
                  animation: 'pulse 0.8s ease infinite alternate'
                }}
              >
                <style>{`@keyframes pulse{from{box-shadow:0 0 0 0 #22c55e66}to{box-shadow:0 0 0 10px transparent}}`}</style>
                EJECT
              </button>
            ) : (
              <button
                onClick={initiate}
                disabled={sessionLoading || bankroll < wager}
                style={{
                  padding: '0.5rem 1.5rem', borderRadius: '8px',
                  background: agentColor, color: '#000',
                  fontWeight: 800, fontSize: '0.95rem', border: 'none',
                  opacity: sessionLoading || bankroll < wager ? 0.5 : 1,
                  cursor: sessionLoading || bankroll < wager ? 'not-allowed' : 'pointer'
                }}
              >
                {sessionLoading ? 'Verifying…' : !sessionGranted ? 'Connect & Start' : 'INITIATE'}
              </button>
            )}
          </div>
        </div>

        {/* Result message */}
        {resultMsg && (
          <div style={{
            padding: '0.6rem 1rem', borderRadius: '8px',
            background: phase === 'crashed' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${phase === 'crashed' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            color: phase === 'crashed' ? '#ef4444' : '#22c55e',
            fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem'
          }}>
            {resultMsg}
          </div>
        )}

        {/* Stats bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem', marginBottom: '1.25rem'
        }}>
          {[
            { label: 'Bankroll', value: bankroll },
            { label: 'Round', value: round },
            { label: 'Streak', value: streak },
            { label: 'Win rate', value: `${winRate}%` }
          ].map(s => (
            <div key={s.label} style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: '#0c0e14',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Round feed */}
        {feed.length > 0 && (
          <div style={{
            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
            background: '#0c0e14', padding: '0.75rem', marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>ROUND FEED</div>
            {feed.map(f => (
              <div key={f.id} style={{
                fontSize: '0.8rem', color: f.color,
                padding: '0.2rem 0',
                borderTop: '1px solid rgba(255,255,255,0.04)'
              }}>{f.text}</div>
            ))}
          </div>
        )}

        {/* x402 session status */}
        {!sessionGranted && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '8px',
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.2)',
            fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)',
            marginBottom: '1rem'
          }}>
            <strong style={{ color: '#a855f7' }}>x402 Session Gate</strong> — Connect your Base wallet to verify session access. Payment is processed via x402 on Base.
          </div>
        )}

        {/* Footer note */}
        <div style={{
          textAlign: 'center', fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.2)', paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.04)'
        }}>
          Veklom Agent Duel · Built on Base · veklom.com · For entertainment purposes
        </div>

      </div>
    </div>
  )
}
