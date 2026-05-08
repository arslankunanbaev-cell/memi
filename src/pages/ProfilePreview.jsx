import { useMemo, useState } from 'react'
import BottomSheet from '../components/BottomSheet'
import SongSearchSheet from '../components/SongSearchSheet'
import { updatePublicProfile } from '../lib/api'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
import { MONTHS_GENITIVE } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'
import { PublicProfileContent } from './PublicProfile'
import { useSwipeBack } from '../hooks/useSwipeBack'

function sinceLabel(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

function uniqueMonths(moments) {
  return new Set(
    moments.map((moment) => {
      const date = new Date(getMomentDisplayAt(moment))
      return `${date.getFullYear()}-${date.getMonth()}`
    }),
  ).size
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function BackArrowIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill="#3D2B1A" />
      <circle cx="12" cy="12" r="1.8" fill="#3D2B1A" />
      <circle cx="18" cy="12" r="1.8" fill="#3D2B1A" />
    </svg>
  )
}

function EditPencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 5.5l4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16.75V20h3.25L18 9.25 14.75 6 4 16.75Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7.75 16.25 11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PublicProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 7.5h2.5M19.75 6.25v2.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function PublicProfileToggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className="flex items-center transition-opacity active:opacity-70"
      style={{
        width: 50,
        height: 30,
        padding: 3,
        borderRadius: 999,
        border: 'none',
        backgroundColor: checked ? 'var(--accent)' : 'var(--surface)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(23,20,14,0.18)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.18s ease',
        }}
      />
    </button>
  )
}

// ── Banner templates ───────────────────────────────────────────────────────────

const BANNER_TEMPLATES = [
  { id: 'almond', src: '/banners/almond.png', label: 'Цветущий миндаль' },
  { id: 'starry', src: '/banners/starry.png', label: 'Звёздная ночь' },
  { id: 'storm', src: '/banners/storm.png', label: 'Буря' },
  { id: 'garden', src: '/banners/garden.png', label: 'Сад в Живерни' },
  { id: 'kiss', src: '/banners/kiss.png', label: 'Поцелуй' },
  { id: 'dali', src: '/banners/dali.png', label: 'Постоянство памяти' },
  { id: 'marat', src: '/banners/marat.png', label: 'Смерть Марата' },
]

const FEATURED_MOMENT_SURFACE = 'var(--featured-moment-surface)'
const FEATURED_MOMENT_SELECTED_SURFACE = 'var(--featured-moment-selected-surface)'

// ── Edit sheet ─────────────────────────────────────────────────────────────────

function PublicProfileSheet({ currentUser, publicMoments, isPremium, onClose, onSaved }) {
  const [enabled, setEnabled] = useState(currentUser?.public_profile_enabled === true)
  const [bio, setBio] = useState(currentUser?.bio ?? '')
  const [favoriteSong, setFavoriteSong] = useState(() => (
    currentUser?.favorite_song_title
      ? {
          name: currentUser.favorite_song_title,
          artist: currentUser.favorite_song_artist ?? '',
          cover: currentUser.favorite_song_cover ?? null,
          previewUrl: currentUser.favorite_song_preview_url ?? null,
        }
      : null
  ))
  const [featuredMomentId, setFeaturedMomentId] = useState(() => (
    publicMoments.some((m) => m.id === currentUser?.featured_moment_id)
      ? currentUser.featured_moment_id
      : null
  ))
  const [bannerUrl, setBannerUrl] = useState(currentUser?.banner_url ?? null)
  const [saving, setSaving] = useState(false)
  const [showSongSheet, setShowSongSheet] = useState(false)

  async function handleSave() {
    if (!currentUser?.id || saving) return

    setSaving(true)

    const selectedFeaturedMomentId = publicMoments.some((m) => m.id === featuredMomentId)
      ? featuredMomentId
      : null

    // Optimistic close — закрываем сразу, сохраняем в фоне
    onClose()

    try {
      const updated = await updatePublicProfile(currentUser.id, {
        publicProfileEnabled: enabled,
        bio,
        featuredMomentId: selectedFeaturedMomentId,
        bannerUrl: isPremium ? bannerUrl : undefined,
        favoriteSong,
      })
      onSaved(updated)
    } catch (saveError) {
      console.error('[PublicProfile] save settings error:', saveError)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Публичный профиль">
      <div className="px-4 pb-5">
        {/* Visibility toggle */}
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: 20 }}>
          <div className="min-w-0">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
              Показывать профиль другим
            </p>
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 4 }}>
              Если профиль открыт, друзья увидят моменты с доступом «Всем друзьям»
            </p>
          </div>
          <PublicProfileToggle
            checked={enabled}
            disabled={saving}
            onChange={() => setEnabled((prev) => !prev)}
            label="Показывать профиль другим"
          />
        </div>

        {/* Favorite song */}
        <div style={{ marginBottom: 18 }}>
          <p className="section-label">Любимая песня</p>
          {favoriteSong ? (
            <div
              className="flex items-center gap-3"
              style={{
                backgroundColor: 'var(--base)',
                borderRadius: 18,
                boxShadow: 'inset 0 0 0 1px rgba(160, 94, 44, 0.08)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent-light), var(--surface))',
                }}
              >
                {favoriteSong.cover && (
                  <img
                    src={proxifyCoverUrl(favoriteSong.cover)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans truncate" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
                  {favoriteSong.name}
                </p>
                {favoriteSong.artist && (
                  <p className="font-sans truncate" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 2 }}>
                    {favoriteSong.artist}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSongSheet(true)}
                className="font-sans transition-opacity active:opacity-60"
                style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}
              >
                Изм.
              </button>
              <button
                type="button"
                onClick={() => setFavoriteSong(null)}
                className="font-sans transition-opacity active:opacity-60"
                style={{ border: 'none', background: 'none', color: 'var(--soft)', fontSize: 18, lineHeight: 1 }}
                aria-label="Убрать любимую песню"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSongSheet(true)}
              className="flex w-full items-center justify-between transition-opacity active:opacity-60"
              style={{
                backgroundColor: 'var(--base)',
                border: 'none',
                borderRadius: 18,
                boxShadow: 'inset 0 0 0 1px rgba(160, 94, 44, 0.08)',
                color: 'var(--mid)',
                padding: '14px 16px',
              }}
            >
              <span className="font-sans" style={{ fontSize: 14, fontWeight: 600 }}>Выбрать саундтрек профиля</span>
              <span style={{ color: 'var(--accent)', fontSize: 20, lineHeight: 1 }}>+</span>
            </button>
          )}
        </div>

        {/* Bio */}
        <div style={{ marginBottom: 18 }}>
          <p className="section-label">О себе</p>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Пара слов о себе"
            rows={2}
            maxLength={140}
            className="w-full resize-none profile-bio-copy outline-none"
            style={{
              backgroundColor: 'var(--base)',
              borderRadius: 16,
              border: 'none',
              color: 'var(--text)',
              padding: '14px 16px',
              boxShadow: 'inset 0 0 0 1px rgba(160, 94, 44, 0.08)',
            }}
          />
        </div>

        {/* Banner */}
        <div style={{ marginBottom: 20 }}>
          <p className="section-label">Баннер профиля</p>

          <div className="flex gap-2 overflow-x-auto" style={{ paddingBottom: 4, scrollbarWidth: 'none' }}>
            <button
              type="button"
              onClick={() => isPremium && setBannerUrl(null)}
              disabled={!isPremium}
              className="flex-shrink-0 flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 72,
                height: 36,
                borderRadius: 10,
                border: !bannerUrl && isPremium ? '2px solid var(--accent)' : '2px solid transparent',
                background: `radial-gradient(circle at top right, rgba(255,255,255,0.34), transparent 34%),
                  linear-gradient(180deg, var(--deep) 0%, var(--accent) 56%, var(--accent-light) 100%)`,
                boxShadow: !bannerUrl && isPremium ? '0 0 0 1px var(--accent)' : 'none',
                opacity: isPremium ? 1 : 0.45,
              }}
            >
              {!bannerUrl && isPremium && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {BANNER_TEMPLATES.map((tmpl) => {
              const isSelected = bannerUrl === tmpl.src
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => isPremium ? setBannerUrl(tmpl.src) : undefined}
                  disabled={!isPremium}
                  className="flex-shrink-0 relative overflow-hidden transition-opacity active:opacity-60"
                  style={{
                    width: 72,
                    height: 36,
                    borderRadius: 10,
                    border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
                    opacity: isPremium ? 1 : 0.55,
                    padding: 0,
                  }}
                >
                  <img
                    src={tmpl.src}
                    alt={tmpl.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {!isPremium && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.30)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(255,255,255,0.9)" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                  {isSelected && isPremium && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {!isPremium && (
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 8 }}>
              Баннер доступен для подписчиков{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Memi Premium ⭐</span>
            </p>
          )}
        </div>

        {/* Featured moment */}
        <div style={{ marginBottom: 20 }}>
          <p className="section-label">Главное воспоминание</p>

          {publicMoments.length === 0 ? (
            <div
              className="font-sans"
              style={{ backgroundColor: 'var(--base)', borderRadius: 16, color: 'var(--mid)', fontSize: 13, lineHeight: 1.5, padding: '14px 16px' }}
            >
              Сначала сделай хотя бы один момент видимым для друзей, и его можно будет выбрать здесь.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setFeaturedMomentId(null)}
                className="flex w-full items-center justify-between rounded-[16px] text-left transition-opacity active:opacity-60"
                style={{
                  border: featuredMomentId ? '1.5px solid var(--featured-moment-border)' : '1.5px solid var(--featured-moment-selected-border)',
                  background: featuredMomentId ? FEATURED_MOMENT_SURFACE : FEATURED_MOMENT_SELECTED_SURFACE,
                  backgroundClip: 'padding-box',
                  boxShadow: featuredMomentId ? 'var(--featured-moment-shadow)' : 'var(--featured-moment-selected-shadow)',
                  color: 'var(--featured-moment-title)',
                  overflow: 'hidden',
                  padding: '13px 15px',
                }}
              >
                <span className="font-sans" style={{ fontSize: 14, fontWeight: 500 }}>Без главного воспоминания</span>
                {!featuredMomentId && (
                  <span className="font-sans" style={{ color: 'var(--featured-moment-selected-label)', fontSize: 12, fontWeight: 600 }}>Выбрано</span>
                )}
              </button>

              {publicMoments.map((moment) => {
                const isSelected = featuredMomentId === moment.id
                return (
                  <button
                    key={moment.id}
                    type="button"
                    onClick={() => setFeaturedMomentId(moment.id)}
                    className="flex w-full items-center gap-3 rounded-[16px] text-left transition-opacity active:opacity-60"
                    style={{
                      border: isSelected ? '1.5px solid var(--featured-moment-selected-border)' : '1.5px solid var(--featured-moment-border)',
                      background: isSelected ? FEATURED_MOMENT_SELECTED_SURFACE : FEATURED_MOMENT_SURFACE,
                      backgroundClip: 'padding-box',
                      boxShadow: isSelected ? 'var(--featured-moment-selected-shadow)' : 'var(--featured-moment-shadow)',
                      overflow: 'hidden',
                      padding: '11px 12px',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
                      }}
                    >
                      {moment.photo_url && (
                        <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans" style={{ color: 'var(--featured-moment-title)', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {moment.title || 'Без названия'}
                      </p>
                      <p className="font-sans" style={{ color: 'var(--featured-moment-meta)', fontSize: 12, marginTop: 2 }}>
                        {sinceLabel(getMomentDisplayAt(moment))}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="font-sans" style={{ color: 'var(--featured-moment-selected-label)', fontSize: 12, fontWeight: 600 }}>Выбрано</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: saving ? 'var(--surface)' : 'var(--accent)',
            color: saving ? 'var(--soft)' : '#fff',
            borderRadius: 9999,
            padding: '13px 0',
            fontSize: 15,
            border: 'none',
            marginBottom: 12,
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}
        >
          Отмена
        </button>
      </div>
      {showSongSheet && (
        <SongSearchSheet
          title="Любимая песня"
          onClose={() => setShowSongSheet(false)}
          onSelect={(track) => setFavoriteSong(track)}
        />
      )}
    </BottomSheet>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProfilePreview() {
  const currentUser = useAppStore((state) => state.currentUser)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const moments = useAppStore((state) => state.moments)
  const friends = useAppStore((state) => state.friends) ?? []
  const isPremium = useAppStore((state) => state.isPremium)

  const [showPublicProfileMenu, setShowPublicProfileMenu] = useState(false)
  const [showPublicProfileSheet, setShowPublicProfileSheet] = useState(false)

  const ownMoments = useMemo(
    () => moments
      .filter((moment) => !moment.isShared && moment.user_id === currentUser?.id)
      .slice()
      .sort(compareMomentsByDisplayAt),
    [moments, currentUser?.id],
  )

  const publicMoments = useMemo(
    () => ownMoments.filter((moment) => moment.visibility !== 'private'),
    [ownMoments],
  )

  const name = currentUser?.name || 'Пользователь'
  const publicProfileStats = {
    moments: publicMoments.length,
    months: uniqueMonths(publicMoments),
    friends: friends.length,
  }
  const { goBack, swipeBackHandlers } = useSwipeBack({
    enabled: !showPublicProfileMenu && !showPublicProfileSheet,
    fallbackPath: '/profile',
  })

  function handleOpenEditor() {
    setShowPublicProfileMenu(false)
    setShowPublicProfileSheet(true)
  }

  return (
    <div
      className="flex h-full flex-col animate-route-enter"
      {...swipeBackHandlers}
      style={{ backgroundColor: 'var(--base)', ...swipeBackHandlers.style }}
      data-testid="profile-preview-screen"
    >
      <div className="px-4 pt-topbar" style={{ paddingBottom: 12 }}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 font-sans type-action transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none', padding: '8px 0', color: 'var(--mid)' }}
          >
            <BackArrowIcon />
            Профиль
          </button>

          <span className="font-sans type-screen-title" style={{ color: 'var(--text)' }}>
            Публичный профиль
          </span>

          <div className="flex justify-end" style={{ width: 72 }}>
            <button
              type="button"
              aria-label="Редактировать публичный профиль"
              onClick={() => setShowPublicProfileMenu(true)}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(160, 94, 44, 0.12)',
                backdropFilter: 'blur(8px)',
              }}
              data-testid="public-profile-more-button"
            >
              <MoreIcon />
            </button>
          </div>
        </div>
      </div>

      <PublicProfileContent
        profileUser={currentUser}
        moments={publicMoments}
        publicMomentsTotal={publicMoments.length}
        stats={publicProfileStats}
        displayName={name}
        contentPaddingBottom={40}
        profileUserIsPremium={isPremium}
      />

      {showPublicProfileMenu && (
        <BottomSheet onClose={() => setShowPublicProfileMenu(false)}>
          <div className="px-4 pb-4 pt-1">
            <button
              type="button"
              onClick={handleOpenEditor}
              data-testid="public-profile-edit-button"
              className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left transition-opacity active:opacity-60"
              style={{
                border: 'none',
                backgroundColor: 'var(--moment-surface)',
                boxShadow: '0 8px 24px rgba(80,50,30,0.08)',
              }}
            >
              <span
                className="flex items-center justify-center rounded-[14px] flex-shrink-0"
                style={{ width: 40, height: 40, backgroundColor: 'rgba(217, 139, 82, 0.18)', color: 'var(--deep)' }}
              >
                <EditPencilIcon />
              </span>
              <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
                Редактировать
              </span>
            </button>
          </div>
        </BottomSheet>
      )}

      {showPublicProfileSheet && (
        <PublicProfileSheet
          currentUser={currentUser}
          publicMoments={publicMoments}
          isPremium={isPremium}
          onClose={() => setShowPublicProfileSheet(false)}
          onSaved={(updatedUser) => {
            setCurrentUser(updatedUser)
          }}
        />
      )}
    </div>
  )
}
