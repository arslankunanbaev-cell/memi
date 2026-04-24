import '../styles/globals.css'
import { getTutorialCard } from './demoData'

export default function TutorialCard() {
  const params = new URLSearchParams(window.location.search)
  const card = getTutorialCard(params.get('card') ?? 'home')
  const iframeSrc = `./tutorial-app.html?screen=${encodeURIComponent(card.screen)}`
  const titleFontSize = card.title.length > 22 ? 58 : card.title.length > 18 ? 62 : 68

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '56px 54px',
        background: `
          radial-gradient(circle at top left, rgba(255,255,255,0.86), transparent 34%),
          radial-gradient(circle at bottom right, rgba(217,139,82,0.16), transparent 26%),
          linear-gradient(180deg, #FBF8F4 0%, #F7F4F0 45%, #F1E9DF 100%)
        `,
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 42,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'rgba(255,255,255,0.58)',
          boxShadow: '0 24px 70px rgba(80, 50, 30, 0.12)',
          border: '1px solid rgba(160, 94, 44, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -70,
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217,139,82,0.24) 0%, rgba(217,139,82,0) 72%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: -90,
            bottom: -120,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,94,44,0.12) 0%, rgba(160,94,44,0) 72%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            height: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '66px 42px 56px 56px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              className="font-serif"
              style={{
                color: 'var(--text)',
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              memi
            </div>

            <div
              className="font-sans"
              style={{
                display: 'inline-flex',
                width: 'fit-content',
                marginTop: 44,
                padding: '8px 14px',
                borderRadius: 999,
                backgroundColor: 'rgba(217, 139, 82, 0.12)',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {card.step}
            </div>

            <h1
              className="font-serif"
              style={{
                color: 'var(--text)',
                fontSize: titleFontSize,
                lineHeight: 0.94,
                fontWeight: 600,
                letterSpacing: '-0.04em',
                margin: '22px 0 0',
                maxWidth: 420,
              }}
            >
              {card.title}
            </h1>

            <p
              className="font-sans"
              style={{
                color: 'var(--mid)',
                fontSize: 24,
                lineHeight: 1.5,
                margin: '24px 0 0',
                maxWidth: 440,
              }}
            >
              {card.description}
            </p>

            <div style={{ flex: 1 }} />

            <p
              className="font-sans"
              style={{
                color: 'var(--soft)',
                fontSize: 16,
                lineHeight: 1.45,
                margin: 0,
                maxWidth: 420,
              }}
            >
              Простой мини-туториал внутри Telegram, чтобы с первых секунд было понятно, как пользоваться memi.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '56px 56px 56px 12px',
            }}
          >
            <div
              style={{
                width: 432,
                height: 934,
                padding: 12,
                borderRadius: 54,
                background: 'linear-gradient(180deg, #3B2D21 0%, #1E1813 100%)',
                boxShadow: '0 22px 60px rgba(23, 20, 14, 0.28)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 42,
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#000',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 132,
                    height: 28,
                    borderRadius: 999,
                    backgroundColor: '#111',
                    zIndex: 2,
                  }}
                />

                <iframe
                  title={card.title}
                  src={iframeSrc}
                  style={{
                    width: '390px',
                    height: '844px',
                    border: 'none',
                    transform: 'scale(1.0769)',
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
