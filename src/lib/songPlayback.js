import { useSyncExternalStore } from 'react'

let audio = null

const listeners = new Set()
let state = {
  current: null,
  status: 'idle',
  error: null,
}

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function setState(patch) {
  state = { ...state, ...patch }
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function getSongKey(song) {
  return song?.key ?? [song?.title, song?.artist].filter(Boolean).join('::').toLowerCase()
}

function bindAudioEvents(nextAudio, song) {
  nextAudio.addEventListener('play', () => {
    if (audio !== nextAudio) return
    setState({ current: { ...song, key: getSongKey(song) }, status: 'playing', error: null })
  })
  nextAudio.addEventListener('pause', () => {
    if (audio !== nextAudio) return
    setState({ status: nextAudio.ended ? 'idle' : 'paused' })
  })
  nextAudio.addEventListener('ended', () => {
    if (audio !== nextAudio) return
    setState({ status: 'idle' })
  })
  nextAudio.addEventListener('error', () => {
    if (audio !== nextAudio) return
    setState({ status: 'idle', error: 'audio-error' })
  })
}

export async function toggleSongPlayback(song) {
  const previewUrl = song?.previewUrl
  if (!previewUrl) {
    setState({ error: 'missing-preview' })
    return false
  }

  const key = getSongKey(song)
  const isSameSong = state.current?.key === key

  if (audio && isSameSong && state.status === 'playing') {
    audio.pause()
    return true
  }

  if (!audio || !isSameSong || audio.src !== previewUrl) {
    if (audio) {
      audio.pause()
    }
    audio = new Audio(previewUrl)
    bindAudioEvents(audio, song)
  }

  setState({
    current: { ...song, key },
    status: 'loading',
    error: null,
  })

  try {
    await audio.play()
    return true
  } catch (error) {
    console.warn('[songPlayback] audio preview failed:', error?.message)
    setState({ status: 'idle', error: 'play-failed' })
    return false
  }
}

export function stopSongPlayback() {
  if (audio) {
    audio.pause()
    audio = null
  }
  setState({ current: null, status: 'idle', error: null })
}

export function useSongPlayback() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getPlaybackSongKey(song) {
  return getSongKey(song)
}
