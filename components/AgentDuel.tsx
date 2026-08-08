'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import WalletConnect from './WalletConnect'

type Phase = 'idle' | 'running' | 'secured' | 'collapsed'
type Agent = 'vector' | 'switch'

const NODES = ['Open', 'Split', 'Feint', 'Commit', 'Slip', 'Fork', 'Trace', 'Pivot', 'Lock']

function routeEnd(): number {
  // Practice-round distribution only. No monetary payout is derived from this value.
  const r = Math.random()
  if (r < 0.04) return 1.05
  return Math.min(12, Math.max(1.1, 1 / (1 - r * 0.92)))
}

export default function AgentDuel() {
  const [agent, setAgent] = useState<Agent>('vector')
  const [phase, setPhase] = useState<Phase>('idle')
  const [multiplier, setMultiplier] = useState(1)
  const [activeNode, setActiveNode] = useState(0)
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [result, setResult] = useState('Choose a route and test your timing.')
  const [history, setHistory] = useState<{ round: number; agent: Agent; at: number; result: 'secured' | 'collapsed'; score: number }[]>([])

  const [verifiedSession, setVerifiedSession] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionBusy, setSessionBusy] = useState(false)
  const [paymentProof, setPaymentProof] = useState('')
  const [paymentRequired, setPaymentRequired] = useState<any>(null)
  const [sessionError, setSessionError] = useState('')

  const raf = useRef<number>(0)
  const startedAt = useRef(0)
  const endAt = useRef(1)
  const liveMultiplier = useRef(1)

  const stopLoop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  useEffect(() => stopLoop, [stopLoop])

  const finishCollapsed = useCallback((at: number) => {
    stopLoop()
    setPhase('collapsed')
    setStreak(0)
    setResult(`Route collapsed at ${at.toFixed(2)}×. Read the pattern and try again.`)
    setHistory(prev => [{ round, agent, at, result: 'collapsed', score: 0 }, ...prev].slice(0, 12))
    setRound(r => r + 1)
  }, [agent, round, stopLoop])

  const startRound = () => {
    if (phase === 'running') return
    stopLoop()
    endAt.current = routeEnd()
    liveMultiplier.current = 1
    startedAt.current = performance.now()
    setMultiplier(1)
    setActiveNode(0)
    setPhase('running')
    setResult('Route active. Secure your exit before it collapses.')

    const tick = (now: number) => {
      const elapsed = (now - startedAt.current) / 1000
      const next = Math.exp(elapsed * 0.34)
      liveMultiplier.current = next
      setMultiplier(next)
      setActiveNode(Math.min(8, Math.floor((next - 1) * 2.7)))

      if (next >= endAt.current) {
        finishCollapsed(next)
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  const secureExit = () => {
    if (phase !== 'running') return
    stopLoop()
    const at = liveMultiplier.current
    const gained = Math.max(1, Math.round((at - 1) * 100))
    setScore(s => s + gained)
    setStreak(s => s + 1)
    setPhase('secured')
    setResult(`Exit secured at ${at.toFixed(2)}× · +${gained} skill points.`)
    setHistory(prev => [{ round, agent, at, result: 'secured', score: gained }, ...prev].slice(0, 12))
    setRound(r => r + 1)
  }

  const requestPaidSession = async () => {
    setSessionBusy(true)
    setSessionError('')
    try {
      const headers: Record<string, string> = {}
      if (paymentProof.trim()) headers['X-PAYMENT'] = paymentProof.trim()

      const response = await fetch('/api/session', { headers, cache: 'no-store' })
      const body = await response.json().catch(() => null)

      if (response.status === 402) {
        setVerifiedSession(false)
        setSessionId(null)
        setPaymentRequired(body)
        setSessionError('Payment is required for a verified session. Practice mode remains free and uses points only.')
        return
      }
      if (!response.ok || !body?.paymentVerified || !body?.session) {
        throw new Error(body?.error || `Session service returned HTTP ${response.status}`)
      }

      setVerifiedSession(true)
      setSessionId(body.sessionId || null)
      setPaymentRequired(null)
      setSessionError('')
    } catch (error: any) {
      setVerifiedSession(false)
      setSessionId(null)
      setSessionError(error?.message || 'Verified session could not be established.')
    } finally {
      setSessionBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050609] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090b10]/95 backdrop-blur px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Veklom Agent Duel</div>
            <h1 className="mt-1 text-xl font-semibold">Read the route. Time the exit.</h1>
          </div>
          <WalletConnect />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Practice round {round}</p>
                <p className="mt-1 text-sm text-slate-400">Practice uses skill points only. A paid x402 session unlocks verified-session provenance; it does not turn practice points into cash.</p>
              </div>
              <div className="flex gap-2">
                {(['vector', 'switch'] as Agent[]).map(choice => (
                  <button key={choice} disabled={phase === 'running'} onClick={() => setAgent(choice)} className={`rounded-lg px-4 py-2 text-sm font-medium ${agent === choice ? 'bg-cyan-400 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
                    {choice === 'vector' ? 'Vector North' : 'Quiet Switch'}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-8 text-center">
              <div className={`text-6xl font-black tracking-tight ${phase === 'collapsed' ? 'text-red-400' : phase === 'secured' ? 'text-emerald-400' : 'text-cyan-300'}`}>
                {multiplier.toFixed(2)}×
              </div>
              <p className="mt-3 text-sm text-slate-400">{result}</p>
            </div>

            <div className="grid grid-cols-9 gap-1">
              {NODES.map((node, index) => (
                <div key={node} className={`rounded-md border px-1 py-3 text-center text-[10px] ${index <= activeNode ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300' : 'border-white/5 bg-white/[0.02] text-slate-600'}`}>
                  <div className="mx-auto mb-1 h-1.5 w-1.5 rounded-full bg-current" />{node}
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={startRound} disabled={phase === 'running'} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 font-semibold disabled:opacity-40">Start route</button>
              <button onClick={secureExit} disabled={phase !== 'running'} className="rounded-xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950 disabled:opacity-30">Secure exit</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Skill score" value={score.toLocaleString()} />
            <Stat label="Current streak" value={String(streak)} />
            <Stat label="Session provenance" value={verifiedSession ? 'Verified' : 'Practice'} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0f16] p-5">
            <h2 className="font-semibold">Recent rounds</h2>
            <div className="mt-3 divide-y divide-white/5">
              {history.length === 0 ? <p className="py-4 text-sm text-slate-500">No rounds yet.</p> : history.map(item => (
                <div key={`${item.round}-${item.at}`} className="grid grid-cols-[70px_1fr_90px_90px] gap-2 py-3 text-sm">
                  <span className="text-slate-500">#{item.round}</span>
                  <span>{item.agent === 'vector' ? 'Vector North' : 'Quiet Switch'}</span>
                  <span className={item.result === 'secured' ? 'text-emerald-400' : 'text-red-400'}>{item.result}</span>
                  <span className="text-right font-mono">{item.at.toFixed(2)}×</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Verified session</h2>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${verifiedSession ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>{verifiedSession ? 'verified' : 'not verified'}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">The server only grants this state after x402 verification and settlement. No frontend demo bypass exists.</p>

            <label className="mt-4 block text-xs text-slate-400">Payment authorization / proof</label>
            <textarea value={paymentProof} onChange={e => setPaymentProof(e.target.value)} rows={4} placeholder="Paste a real x402 payment proof from a compatible wallet/client" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs outline-none focus:border-cyan-400/50" />
            <button onClick={requestPaidSession} disabled={sessionBusy} className="mt-3 w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{sessionBusy ? 'Checking…' : paymentProof.trim() ? 'Verify paid session' : 'Get payment requirements'}</button>

            {sessionError && <p className="mt-3 text-xs leading-5 text-amber-300">{sessionError}</p>}
            {sessionId && <p className="mt-3 break-all font-mono text-[10px] text-slate-500">session {sessionId}</p>}
            {paymentRequired && <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-[10px] text-slate-400">{JSON.stringify(paymentRequired, null, 2)}</pre>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0f16] p-5">
            <h2 className="font-semibold">Why come back</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>• Improve timing and route-reading skill.</li>
              <li>• Build transparent streak and round history.</li>
              <li>• Compare strategies without fake winnings.</li>
              <li>• Verified sessions can later bind rounds to Veklom evidence.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#0c0f16] p-4"><div className="text-xs uppercase tracking-widest text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>
}
