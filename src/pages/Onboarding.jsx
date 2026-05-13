import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'
import { markIntroOnboardingSeen } from '../lib/onboarding'
import { tgHaptic } from '../lib/telegram'

const STEPS = [
  {
    eyebrow: 'Моменты',
    title: 'Сохраняй то, что хочется вспомнить',
    description: 'Фото, музыка, место, подпись и настроение складываются в один момент.',
    preview: 'moment',
  },
  {
    eyebrow: 'Память',
    title: 'Memi собирает твою личную ленту',
    description: 'Главная показывает живые воспоминания, а архив раскладывает все по месяцам.',
    preview: 'archive',
  },
  {
    eyebrow: 'Люди',
    title: 'Связывай моменты с близкими',
    description: 'Отмечай людей, приглашай друзей и открывай вашу общую историю.',
    preview: 'people',
  },
]

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MomentPreview() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="font-sans" style={{ color: '#FFF8F0', fontSize: 12, fontWeight: 700 }}>Сегодня</span>
        <span style={{ fontSize: 22 }}>♪</span>
      </div>
      <div>
        <div style={{ width: '72%', height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.8)', marginBottom: 8 }} />
        <div style={{ width: '48%', height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.52)' }} />
      </div>
    </div>
  )
}

function ArchivePreview() {
  return (
    <div className="grid h-full grid-cols-3 gap-2">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          style={{
            borderRadius: 16,
            background: item % 2 === 0 ? 'rgba(255,255,255,0.78)' : 'rgba(23,20,14,0.16)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  )
}

function PeoplePreview() {
  return (
    <div className="flex h-full items-center justify-center">
      {['М', 'А', 'Я'].map((letter, index) => (
        <div
          key={letter}
          className="flex items-center justify-center rounded-full font-sans"
          style={{
            width: 72,
            height: 72,
            marginLeft: index === 0 ? 0 : -18,
            background: ['#D98B52', '#6B8F71', '#8A7A6A'][index],
            border: '4px solid rgba(255,255,255,0.78)',
            color: '#fff',
            fontSize: 22,
            fontWeight: 800,
            boxShadow: '0 12px 28px rgba(80,50,30,0.18)',
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  )
}

function StepPreview({ type }) {
  return (
    <div
      className="mt-8 overflow-hidden"
      style={{
        height: 210,
        borderRadius: 28,
        padding: 18,
        background:
          'radial-gradient(circle at 18% 0%, rgba(255,255,255,0.88), transparent 34%), linear-gradient(145deg, rgba(160,94,44,0.92), rgba(217,139,82,0.72) 52%, rgba(237,230,220,0.92))',
        border: '1px solid rgba(160,94,44,0.1)',
        boxShadow: 'var(--shadow-card-strong)',
      }}
    >
      {type === 'archive' ? <ArchivePreview /> : type === 'people' ? <PeoplePreview /> : <MomentPreview />}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function finish(method) {
    tgHaptic('light')
    markIntroOnboardingSeen()
    void trackEvent('onboarding_completed', { method, variant: 'intro_v1' })
    navigate('/home', { replace: true })
  }

  function next() {
    tgHaptic('light')
    if (isLast) {
      finish('completed')
      return
    }
    setStep((value) => value + 1)
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex-1 overflow-y-auto px-4 pt-topbar pb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif" style={{ margin: 0, color: 'var(--text)', fontSize: 28, fontWeight: 600, lineHeight: 1, letterSpacing: 0 }}>
            memi
          </p>
          <button
            type="button"
            onClick={() => finish('skipped')}
            className="font-sans transition-opacity active:opacity-60"
            style={{
              border: '1px solid rgba(160,94,44,0.1)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.48)',
              color: 'var(--mid)',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Позже
          </button>
        </div>

        <StepPreview type={current.preview} />

        <div className="mt-8">
          <p className="font-sans" style={{ margin: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
            {current.eyebrow}
          </p>
          <h1
            className="font-serif"
            style={{ margin: '8px 0 0', color: 'var(--text)', fontSize: 38, fontWeight: 600, lineHeight: 0.98, letterSpacing: 0 }}
          >
            {current.title}
          </h1>
          <p className="font-sans" style={{ marginTop: 14, marginBottom: 0, color: 'var(--mid)', fontSize: 15, lineHeight: 1.55 }}>
            {current.description}
          </p>
        </div>
      </div>

      <div className="px-4 pb-safe">
        <div className="mb-4 flex justify-center gap-2">
          {STEPS.map((item, index) => (
            <span
              key={item.eyebrow}
              style={{
                width: index === step ? 22 : 7,
                height: 7,
                borderRadius: 999,
                background: index === step ? 'var(--accent)' : 'rgba(160,94,44,0.18)',
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="flex w-full items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: 20,
            padding: '15px 0',
            fontSize: 16,
            fontWeight: 700,
            border: 'none',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          {isLast ? 'Начать' : 'Дальше'}
          <ArrowIcon />
        </button>
      </div>
    </div>
  )
}
