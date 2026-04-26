import { useEffect, useRef, useState } from 'react'
import introSrc from '../assets/intro.mp4'

type Props = { onDone: () => void }

export default function IntroSplash({ onDone }: Props): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<'in' | 'play' | 'out'>('in')
  const finishedRef = useRef(false)

  const finish = (): void => {
    if (finishedRef.current) return
    finishedRef.current = true
    setPhase('out')
    window.setTimeout(onDone, 520)
  }

  useEffect(() => {
    const t = window.setTimeout(() => setPhase('play'), 30)
    const safety = window.setTimeout(finish, 8000)

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish()
    }
    window.addEventListener('keydown', onKey)

    const v = videoRef.current
    if (v) {
      v.play().catch(() => { /* autoplay блокирован — ждём onEnded или skip */ })
    }

    return () => {
      window.clearTimeout(t)
      window.clearTimeout(safety)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const opacity = phase === 'in' ? 0 : phase === 'play' ? 1 : 0

  return (
    <div
      onClick={finish}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black cursor-pointer select-none drag-region"
      style={{
        opacity,
        transition: 'opacity 500ms ease',
      }}
    >
      <video
        ref={videoRef}
        src={introSrc}
        autoPlay
        muted
        playsInline
        onEnded={finish}
        className="h-full w-full object-cover"
        style={{ transform: phase === 'play' ? 'scale(1)' : 'scale(1.04)', transition: 'transform 900ms ease-out' }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2"
        style={{
          opacity: phase === 'play' ? 1 : 0,
          transform: phase === 'play' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 600ms ease 200ms, transform 600ms ease 200ms',
        }}
      >
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/55">UnLimit</div>
        <div className="h-[2px] w-24 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-white/70"
            style={{ width: '40%', animation: 'introBar 1.4s ease-in-out infinite' }}
          />
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); finish() }}
        className="no-drag absolute right-5 top-5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
      >
        Пропустить · Esc
      </button>

      <style>{`
        @keyframes introBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(260%); }
        }
      `}</style>
    </div>
  )
}
