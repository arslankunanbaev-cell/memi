import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pluralRu } from '../lib/ruPlural'
import BottomNav from '../components/BottomNav'
import FAB from '../components/FAB'
import MomentCard from '../components/MomentCard'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
import BottomSheet from '../components/BottomSheet'
import CapsuleIcon from '../components/CapsuleIcon'
import { AppEmptyState, AppToast } from '../components/FeedbackStates'
import { getMomentAddedAt, compareMomentsByAddedAt } from '../lib/momentTime'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'
import { RouteLoadingState } from '../components/LoadingState'
import { saveCapsuleSlot, getMoments, getSharedMoments, getFriendsFeedMoments, mergeMomentCollections } from '../lib/api'
import { navigateWithTransition } from '../lib/navigation'
import { tgHaptic } from '../lib/telegram'

function today() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const SEASONS = ['зимой', 'зимой', 'весной', 'весной', 'весной', 'летом', 'летом', 'летом', 'осенью', 'осенью', 'осенью', 'зимой']

function dayLabel(iso) {
  const date = new Date(iso)
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const diff = Math.round((today() - dayStart) / 86400000)

  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  if (diff < 7) return `${diff} ${pluralRu(diff, 'день', 'дня', 'дней')} назад`

  const currentYear = new Date().getFullYear()
  if (date.getFullYear() < currentYear) {
    const season = SEASONS[date.getMonth()]
    return `${season[0].toUpperCase()}${season.slice(1)} ${date.getFullYear()}`
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function groupByDay(moments) {
  const groups = new Map()

  for (const moment of moments) {
    const date = new Date(getMomentAddedAt(moment))
    date.setHours(0, 0, 0, 0)

    const key = date.toISOString()

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key).push(moment)
  }

  return Array.from(groups.values()).map((items) => ({
    label: dayLabel(getMomentAddedAt(items[0])),
    items,
  }))
}

const PAGE_SIZE = 20
const PULL_THRESHOLD = 64 // px to trigger refresh

function formatTopbarDate() {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

function QuickAction({ label, hint, danger = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
      style={{
        border: 'none',
        backgroundColor: danger ? 'rgba(217, 64, 64, 0.07)' : 'var(--moment-surface)',
        padding: '14px 16px',
      }}
    >
      <span
        className="flex items-center justify-center rounded-[14px]"
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          backgroundColor: danger ? 'rgba(217, 64, 64, 0.12)' : 'var(--accent-light)',
          color: danger ? '#D94040' : 'var(--accent)',
        }}
      >
        {children}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-sans block" style={{ color: danger ? '#D94040' : 'var(--text)', fontSize: 16, fontWeight: 600 }}>
          {label}
        </span>
        {hint && (
          <span className="font-sans block truncate" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 2 }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}

function MomentActionsSheet({ moment, author, isOwn, capsuleFull, onClose, onOpen, onArchive, onShare, onCapsule, onProfile }) {
  return (
    <BottomSheet onClose={onClose} title={moment.title || 'Момент'}>
      <div className="px-4 pb-4 flex flex-col gap-3">
        <QuickAction label="Открыть" hint="Перейти к деталям момента" onClick={onOpen}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </QuickAction>

        <QuickAction
          label={isOwn ? 'Архивировать' : 'Скрыть из ленты'}
          hint={isOwn ? 'Убрать с главной, оставить в архиве' : 'Убрать этот момент из главной ленты'}
          onClick={onArchive}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" />
            <path d="M3 4h18v3H3V4ZM9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </QuickAction>

        <QuickAction label="Поделиться" hint="Отправить текст момента" onClick={onShare}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8.6 13.7l6.8 3.6M15.4 6.7 8.6 10.3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </QuickAction>

        {isOwn && (
          <QuickAction
            label={capsuleFull ? 'Капсула заполнена' : 'Добавить в капсулу'}
            hint={capsuleFull ? 'Освободи слот в профиле' : 'Положить в первый свободный слот'}
            onClick={onCapsule}
          >
            <CapsuleIcon size={20} />
          </QuickAction>
        )}

        {author && (
          <QuickAction label="Открыть профиль" hint={author.name} onClick={onProfile}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </QuickAction>
        )}
      </div>
    </BottomSheet>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const moments = useAppStore((state) => state.moments)
  const setMoments = useAppStore((state) => state.setMoments)
  const friends = useAppStore((state) => state.friends)
  const currentUser = useAppStore((state) => state.currentUser)
  const capsule = useAppStore((state) => state.capsule)
  const addToCapsule = useAppStore((state) => state.addToCapsule)
  const initDone = useAppStore((state) => state.initDone)
  const setHomeScrollTop = useAppStore((state) => state.setHomeScrollTop)
  const hiddenHomeMomentIds = useAppStore((state) => state.hiddenHomeMomentIds)
  const hideHomeMoment = useAppStore((state) => state.hideHomeMoment)
  const restoreHomeMoment = useAppStore((state) => state.restoreHomeMoment)
  const initialHomeScrollTopRef = useRef(useAppStore.getState().homeScrollTop)
  const currentScrollTopRef = useRef(initialHomeScrollTopRef.current)
  const scrollPersistTimerRef = useRef(null)
  const showScrollTopRef = useRef(initialHomeScrollTopRef.current > 320)
  const [showAdd, setShowAdd] = useState(false)
  const [actionMoment, setActionMoment] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(showScrollTopRef.current)
  const [undoMoment, setUndoMoment] = useState(null)
  const scrollRef = useRef(null)
  const sentinelRef = useRef(null)

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [moments])

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartYRef = useRef(0)
  const pullingRef = useRef(false)

  const visibleMoments = moments.filter((moment) => !hiddenHomeMomentIds.includes(moment.id))
  const isEmpty = visibleMoments.length === 0
  const hasHiddenAllMoments = moments.length > 0 && isEmpty
  const actionMomentIsOwn = actionMoment && !actionMoment.isShared && actionMoment.user_id === currentUser?.id
  const undoMomentIsOwn = undoMoment && !undoMoment.isShared && undoMoment.user_id === currentUser?.id
  const actionMomentAuthor = actionMoment && !actionMomentIsOwn
    ? friends.find((friend) => friend.id === actionMoment.user_id)
    : null
  const emptyCapsuleSlotIndex = capsule.findIndex((slot) => slot === null)
  const topbarDate = formatTopbarDate()
  const topbarAside = (
    <span
      className="flex min-h-7 items-center font-sans type-topbar-meta capitalize"
      style={{ color: 'var(--mid)' }}
    >
      {topbarDate}
    </span>
  )

  useEffect(() => {
    if (!scrollRef.current || isEmpty) return

    const node = scrollRef.current
    const frame = requestAnimationFrame(() => {
      node.scrollTop = initialHomeScrollTopRef.current
    })

    return () => cancelAnimationFrame(frame)
  }, [isEmpty])

  useEffect(() => () => {
    if (scrollPersistTimerRef.current) {
      clearTimeout(scrollPersistTimerRef.current)
    }
    setHomeScrollTop(currentScrollTopRef.current)
  }, [setHomeScrollTop])

  useEffect(() => {
    if (!undoMoment) return undefined

    const timer = setTimeout(() => setUndoMoment(null), 5200)
    return () => clearTimeout(timer)
  }, [undoMoment])

  // Infinite scroll — load next page when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleCount((prev) => prev + PAGE_SIZE)
      }
    }, { threshold: 0.1 })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Pull-to-refresh handlers
  const handleRefresh = useCallback(async () => {
    if (!currentUser?.id || refreshing) return
    tgHaptic('medium')
    setRefreshing(true)
    try {
      const [own, shared] = await Promise.all([
        getMoments(currentUser.id),
        getSharedMoments(currentUser.id).catch(() => []),
      ])
      const friendFeed = friends.length > 0
        ? await getFriendsFeedMoments(friends.map((f) => f.id)).catch(() => [])
        : []
      setMoments(mergeMomentCollections(own, shared, friendFeed))
    } catch (err) {
      console.error('[Home] refresh failed:', err)
    } finally {
      setRefreshing(false)
    }
  }, [currentUser?.id, friends, refreshing, setMoments])

  function handleTouchStart(e) {
    if (scrollRef.current?.scrollTop !== 0) return
    touchStartYRef.current = e.touches[0].clientY
    pullingRef.current = true
  }

  function handleTouchMove(e) {
    if (!pullingRef.current) return
    const dy = e.touches[0].clientY - touchStartYRef.current
    if (dy <= 0) { pullingRef.current = false; setPullY(0); return }
    // Dampen the pull so it doesn't fly off screen
    setPullY(Math.min(dy * 0.45, PULL_THRESHOLD))
  }

  function handleTouchEnd() {
    if (!pullingRef.current) return
    pullingRef.current = false
    if (pullY >= PULL_THRESHOLD * 0.9) {
      handleRefresh()
    }
    setPullY(0)
  }

  if (!initDone && isEmpty) {
    return <RouteLoadingState />
  }

  function closeActions() {
    setActionMoment(null)
  }

  function openMoment(moment) {
    closeActions()
    navigateWithTransition(navigate, `/moment/${moment.id}`)
  }

  function archiveMoment(moment) {
    tgHaptic('medium')
    hideHomeMoment(moment.id)
    setUndoMoment(moment)
    closeActions()
  }

  async function shareMoment(moment) {
    tgHaptic('light')
    const shareText = [moment.title, moment.description].filter(Boolean).join('\n')

    try {
      if (navigator.share) {
        await navigator.share({
          title: moment.title || 'Момент',
          text: shareText || moment.title || 'Момент',
        })
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('[Home] share moment error:', error)
      }
    } finally {
      closeActions()
    }
  }

  async function addMomentToCapsule(moment) {
    if (emptyCapsuleSlotIndex === -1 || !currentUser?.id) return

    tgHaptic('medium')
    addToCapsule(emptyCapsuleSlotIndex, moment)
    closeActions()

    try {
      await saveCapsuleSlot(currentUser.id, emptyCapsuleSlotIndex, moment.id)
    } catch (error) {
      console.error('[Home] save capsule slot error:', error)
    }
  }

  function openAuthorProfile(author) {
    if (!author?.id) return
    closeActions()
    navigateWithTransition(navigate, `/profile/${author.id}`)
  }

  function scrollToTop() {
    const node = scrollRef.current
    if (!node) return

    tgHaptic('light')
    if (scrollPersistTimerRef.current) {
      clearTimeout(scrollPersistTimerRef.current)
      scrollPersistTimerRef.current = null
    }
    node.scrollTo({ top: 0, behavior: 'smooth' })
    currentScrollTopRef.current = 0
    setHomeScrollTop(0)
    showScrollTopRef.current = false
    setShowScrollTop(false)
  }

  function handleHomeScroll(event) {
    const nextTop = event.currentTarget.scrollTop
    const shouldShowScrollTop = nextTop > 320
    currentScrollTopRef.current = nextTop

    if (showScrollTopRef.current !== shouldShowScrollTop) {
      showScrollTopRef.current = shouldShowScrollTop
      setShowScrollTop(shouldShowScrollTop)
    }

    if (scrollPersistTimerRef.current) {
      clearTimeout(scrollPersistTimerRef.current)
    }

    scrollPersistTimerRef.current = setTimeout(() => {
      scrollPersistTimerRef.current = null
      setHomeScrollTop(currentScrollTopRef.current)
    }, 180)
  }

  function undoHideMoment() {
    if (!undoMoment?.id) return

    tgHaptic('light')
    restoreHomeMoment(undoMoment.id)
    setUndoMoment(null)
  }

  return (
    <div className="flex h-full flex-col animate-fade-in" style={{ backgroundColor: 'var(--base)' }}>
      {isEmpty ? (
        <div className="flex flex-1 flex-col">
          <PageHeader
            title="memi"
            brand
            aside={topbarAside}
            style={{ paddingBottom: 18 }}
            containerClassName="items-center"
          />

          {hasHiddenAllMoments ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4" style={{ paddingBottom: 108 }}>
              <AppEmptyState
                icon={(
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                )}
                title="Лента очищена"
                description="Все моменты скрыты с главной. Они по-прежнему доступны в архиве."
                primaryLabel="Вернуть последний"
                onPrimary={undoHideMoment}
                secondaryLabel="Открыть архив"
                onSecondary={() => navigate('/archive')}
              />
            </div>
          ) : (

          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center" style={{ paddingBottom: 108 }}>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 88,
                height: 88,
                backgroundColor: 'var(--card)',
                boxShadow: 'var(--shadow-card)',
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 36 }}>✨</span>
            </div>

            <h2
              className="type-page-title"
              style={{
                color: 'var(--text)',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Первый момент
            </h2>

            <p
              className="font-sans type-body"
              style={{
                color: 'var(--mid)',
                maxWidth: 250,
                marginTop: 12,
              }}
            >
              Сохрани фото, слово или чувство, чтобы лента начала собираться сама.
            </p>

            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="font-sans type-button-strong transition-opacity active:opacity-70"
              style={{
                marginTop: 26,
                border: 'none',
                borderRadius: 20,
                backgroundColor: 'var(--accent)',
                color: '#fff',
                padding: '15px 26px',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              Добавить момент
            </button>
          </div>
          )}
        </div>
      ) : (
        <>
          <PageHeader
            title="memi"
            brand
            aside={topbarAside}
            style={{ paddingBottom: 16 }}
            containerClassName="items-center"
          />

          <div
            ref={scrollRef}
            className="hide-scrollbar flex-1 overflow-y-auto px-4"
            onScroll={handleHomeScroll}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ paddingBottom: 110 }}
          >
            {/* Pull-to-refresh indicator */}
            {(pullY > 0 || refreshing) && (
              <div
                className="flex items-center justify-center"
                style={{
                  height: refreshing ? 40 : pullY,
                  overflow: 'hidden',
                  transition: refreshing ? 'none' : 'height 0.1s',
                  opacity: refreshing ? 1 : pullY / PULL_THRESHOLD,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    color: 'var(--accent)',
                    animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                    transform: refreshing ? undefined : `rotate(${(pullY / PULL_THRESHOLD) * 360}deg)`,
                  }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {groupByDay([...visibleMoments].sort(compareMomentsByAddedAt).slice(0, visibleCount)).map((group, groupIndex) => (
              <section key={group.label} style={{ paddingBottom: 24 }}>
                <SectionLabel style={{ marginBottom: 12 }}>
                  {group.label}
                </SectionLabel>

                <div className="flex flex-col gap-5">
                  {group.items.map((moment, itemIndex) => (
                    <div
                      key={moment.id}
                      style={{
                        animation: 'fadeSlideUp 0.28s ease both',
                        animationDelay: `${(groupIndex * 3 + itemIndex) * 55}ms`,
                      }}
                    >
                      <MomentCard
                        moment={moment}
                        onLongPress={(pressedMoment) => {
                          tgHaptic('medium')
                          setActionMoment(pressedMoment)
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Sentinel for infinite scroll */}
            {visibleCount < visibleMoments.length && (
              <div ref={sentinelRef} style={{ height: 1 }} />
            )}
          </div>

          {showScrollTop && (
            <FAB
              onClick={scrollToTop}
              ariaLabel="Наверх"
              right={84}
              variant="secondary"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </FAB>
          )}
          <FAB onClick={() => setShowAdd(true)} />
        </>
      )}

      <BottomNav active="home" onActiveDoublePress={(tabId) => tabId === 'home' && scrollToTop()} />
      {showAdd && <AddMoment onClose={() => setShowAdd(false)} />}
      {undoMoment && (
        <AppToast
          message={undoMomentIsOwn ? 'Момент скрыт с главной' : 'Момент скрыт из ленты'}
          actionLabel="Отменить"
          onAction={undoHideMoment}
          onClose={() => setUndoMoment(null)}
        />
      )}
      {actionMoment && (
        <MomentActionsSheet
          moment={actionMoment}
          author={actionMomentAuthor}
          isOwn={Boolean(actionMomentIsOwn)}
          capsuleFull={emptyCapsuleSlotIndex === -1}
          onClose={closeActions}
          onOpen={() => openMoment(actionMoment)}
          onArchive={() => archiveMoment(actionMoment)}
          onShare={() => shareMoment(actionMoment)}
          onCapsule={() => addMomentToCapsule(actionMoment)}
          onProfile={() => openAuthorProfile(actionMomentAuthor)}
        />
      )}
    </div>
  )
}
