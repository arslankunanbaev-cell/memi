import { create } from 'zustand'

export const useAppStore = create((set) => ({
  // Auth
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),

  // Init state — используется Splash для навигации
  initDone: false,   // true когда saveUser отработал
  isNew: null,       // true = первый раз, false = уже был
  setInitResult: (user, isNew) => set({ currentUser: user, initDone: true, isNew }),

  // Moments
  moments: [],
  setMoments: (moments) => set({ moments }),
  addMoment: (moment) => set((s) => ({ moments: [moment, ...s.moments] })),
  updateMoment: (id, patch) =>
    set((s) => ({
      moments: s.moments.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  removeMoment: (id) =>
    set((s) => ({ moments: s.moments.filter((m) => m.id !== id) })),

  // People
  people: [],
  setPeople: (people) => set({ people }),
  addPerson: (person) => set((s) => ({ people: [...s.people, person] })),
  updatePerson: (id, patch) =>
    set((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePerson: (id) =>
    set((s) => ({ people: s.people.filter((p) => p.id !== id) })),

  // Capsule — 4 slots (null | moment)
  capsule: [null, null, null, null],
  setCapsule: (rows) => set(() => {
    const slots = [null, null, null, null]
    for (const row of rows) {
      if (row.slotIndex >= 0 && row.slotIndex <= 3) slots[row.slotIndex] = row.moment
    }
    return { capsule: slots }
  }),
  addToCapsule: (slotIndex, moment) =>
    set((s) => {
      const next = [...s.capsule]
      next[slotIndex] = moment
      return { capsule: next }
    }),
  removeFromCapsule: (slotIndex) =>
    set((s) => {
      const next = [...s.capsule]
      next[slotIndex] = null
      return { capsule: next }
    }),

  // Recent songs (last 5)
  recentSongs: [],
  addRecentSong: (song) =>
    set((s) => ({
      recentSongs: [
        song,
        ...s.recentSongs.filter((r) => r.name !== song.name || r.artist !== song.artist),
      ].slice(0, 5),
    })),

  // Recent locations (last 5)
  recentLocations: [],
  addRecentLocation: (loc) =>
    set((s) => ({
      recentLocations: [loc, ...s.recentLocations.filter((l) => l !== loc)].slice(0, 5),
    })),

  // Friends (accepted) + incoming pending requests
  friends: [],
  incomingRequests: [],
  setFriends: (friends) => set({ friends }),
  setIncomingRequests: (reqs) => set({ incomingRequests }),

  // UI
  isOnboarded: false,
  setOnboarded: (v) => set({ isOnboarded: v }),
}))
