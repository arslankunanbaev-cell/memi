import { useAppStore } from '../store/useAppStore.js'

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function photoCard({ title, accentA, accentB, detail = 'memi' }) {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 960">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accentA}" />
          <stop offset="100%" stop-color="${accentB}" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.72)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="720" height="960" rx="48" fill="url(#bg)" />
      <circle cx="172" cy="164" r="138" fill="url(#glow)" />
      <circle cx="598" cy="196" r="96" fill="rgba(255,255,255,0.14)" />
      <circle cx="580" cy="820" r="164" fill="rgba(255,255,255,0.12)" />
      <rect x="66" y="574" width="588" height="242" rx="34" fill="rgba(255,255,255,0.18)" />
      <text x="76" y="126" fill="white" font-family="Inter, sans-serif" font-size="28" font-weight="700" opacity="0.96">memi</text>
      <text x="76" y="706" fill="white" font-family="Cormorant Garamond, serif" font-size="74" font-weight="600">${title}</text>
      <text x="76" y="760" fill="white" font-family="Inter, sans-serif" font-size="28" font-weight="500" opacity="0.92">${detail}</text>
    </svg>
  `)
}

function avatar(name, accentA, accentB) {
  const letter = name[0]?.toUpperCase() ?? 'M'

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accentA}" />
          <stop offset="100%" stop-color="${accentB}" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#bg)" />
      <circle cx="120" cy="90" r="44" fill="rgba(255,255,255,0.26)" />
      <path d="M56 194c18-34 42-52 64-52s46 18 64 52" fill="rgba(255,255,255,0.2)" />
      <text x="120" y="148" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="92" font-weight="700">${letter}</text>
    </svg>
  `)
}

function albumCover(title, accentA, accentB) {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accentA}" />
          <stop offset="100%" stop-color="${accentB}" />
        </linearGradient>
      </defs>
      <rect width="360" height="360" rx="42" fill="url(#bg)" />
      <circle cx="258" cy="98" r="72" fill="rgba(255,255,255,0.14)" />
      <circle cx="104" cy="264" r="98" fill="rgba(255,255,255,0.12)" />
      <text x="42" y="286" fill="white" font-family="Inter, sans-serif" font-size="38" font-weight="700">${title}</text>
    </svg>
  `)
}

export const tutorialCards = [
  {
    id: 'home',
    screen: 'home',
    step: 'Шаг 1',
    title: 'Лента твоих моментов',
    description: 'Все воспоминания собираются в одной красивой ленте. Открывай карточки и возвращайся к любимым дням в пару касаний.',
  },
  {
    id: 'add-basic',
    screen: 'add-basic',
    step: 'Шаг 2',
    title: 'Создай новый момент',
    description: 'Добавь фото, название, описание и настроение. Один экран, чтобы быстро сохранить то, что хочется запомнить.',
  },
  {
    id: 'add-social',
    screen: 'add-social',
    step: 'Шаг 3',
    title: 'Отмечай людей и музыку',
    description: 'К каждому моменту можно прикрепить трек, выбрать с кем ты был и настроить, кто увидит это воспоминание.',
  },
  {
    id: 'people',
    screen: 'people',
    step: 'Шаг 4',
    title: 'Добавляй друзей в memi',
    description: 'Приглашай друзей, принимай заявки и связывай их со своими людьми, чтобы делиться моментами и видеть друг друга в приложении.',
  },
  {
    id: 'profile',
    screen: 'profile',
    step: 'Шаг 5',
    title: 'Капсула воспоминаний',
    description: 'Самые важные моменты можно вынести в капсулу и держать под рукой в профиле как личную коллекцию на всю жизнь.',
  },
]

export const tutorialCardOrder = tutorialCards.map((card) => card.id)

const photos = {
  sunset: photoCard({ title: 'Вечер у моря', accentA: '#D98B52', accentB: '#A05E2C', detail: 'море • солнце • музыка' }),
  picnic: photoCard({ title: 'Пикник', accentA: '#6B8F71', accentB: '#A7C957', detail: 'трава • смех • друзья' }),
  concert: photoCard({ title: 'Концерт', accentA: '#6E5BD4', accentB: '#C26795', detail: 'свет • сцена • ночь' }),
  train: photoCard({ title: 'Ночное окно', accentA: '#3A5A93', accentB: '#89A8D8', detail: 'дорога • мысли • дождь' }),
}

const avatars = {
  alina: avatar('Алина', '#D98B52', '#A05E2C'),
  maria: avatar('Мария', '#B46A4F', '#E8B17A'),
  ilya: avatar('Илья', '#4F7C6D', '#9CC6A8'),
  liza: avatar('Лиза', '#7A6B8A', '#C6B5D8'),
  nika: avatar('Ника', '#5F85B3', '#B1CAE6'),
  sasha: avatar('Саша', '#C1666B', '#F3B3A4'),
}

const covers = {
  waves: albumCover('Sea Waves', '#D98B52', '#A05E2C'),
  city: albumCover('Night Drive', '#3A5A93', '#89A8D8'),
  bloom: albumCover('Bloom', '#6B8F71', '#B1D68A'),
}

const currentUser = {
  id: 'user-1',
  telegram_id: 123456789,
  name: 'Алина',
  photo_url: avatars.alina,
  created_at: '2024-09-12T10:00:00.000Z',
  public_profile_enabled: true,
  featured_moment_id: 'moment-1',
  public_code: 'demo-public-code',
}

const people = [
  {
    id: 'person-1',
    user_id: currentUser.id,
    name: 'Мария',
    photo_url: avatars.maria,
    avatar_color: '#B46A4F',
    linked_user_id: 'friend-1',
  },
  {
    id: 'person-2',
    user_id: currentUser.id,
    name: 'Илья',
    photo_url: avatars.ilya,
    avatar_color: '#4F7C6D',
    linked_user_id: 'friend-2',
  },
  {
    id: 'person-3',
    user_id: currentUser.id,
    name: 'Лиза',
    photo_url: avatars.liza,
    avatar_color: '#7A6B8A',
    linked_user_id: null,
  },
]

const friends = [
  { id: 'friend-1', name: 'Мария', photo_url: avatars.maria, friendship_id: 'fr-1' },
  { id: 'friend-2', name: 'Илья', photo_url: avatars.ilya, friendship_id: 'fr-2' },
  { id: 'friend-3', name: 'Ника', photo_url: avatars.nika, friendship_id: 'fr-3' },
]

const incomingRequests = [
  { id: 'friend-4', name: 'Саша', photo_url: avatars.sasha, friendship_id: 'req-1' },
]

const moments = [
  {
    id: 'moment-1',
    user_id: currentUser.id,
    title: 'Закат у воды',
    description: 'Теплый ветер, плед и плейлист, который теперь всегда будет про этот вечер.',
    mood: '😍',
    location: 'Чарвак',
    photo_url: photos.sunset,
    song_title: 'Sea Waves',
    song_artist: 'Leisure',
    song_cover: covers.waves,
    visibility: 'friends',
    created_at: '2026-04-24T14:20:00.000Z',
    moment_at: '2026-04-24T19:10:00.000Z',
    people: [people[0], people[1]],
    taggedFriends: [friends[2]],
  },
  {
    id: 'moment-2',
    user_id: currentUser.id,
    title: 'Пикник во дворе',
    description: 'Поймали золотой час и смеялись, пока чай не остыл.',
    mood: '😊',
    location: 'Ташкент',
    photo_url: photos.picnic,
    song_title: 'Bloom',
    song_artist: 'The Paper Kites',
    song_cover: covers.bloom,
    visibility: 'friends',
    created_at: '2026-04-23T09:40:00.000Z',
    moment_at: '2026-04-23T18:05:00.000Z',
    people: [people[0], people[2]],
    taggedFriends: [],
  },
  {
    id: 'moment-3',
    user_id: currentUser.id,
    title: 'Ночной концерт',
    description: 'Сцена, огни и чувство, будто весь зал дышит в одном ритме.',
    mood: '🤩',
    location: 'Дворец искусств',
    photo_url: photos.concert,
    song_title: 'Night Drive',
    song_artist: 'Chromatics',
    song_cover: covers.city,
    visibility: 'private',
    created_at: '2026-04-19T11:00:00.000Z',
    moment_at: '2026-04-19T22:15:00.000Z',
    people: [people[1]],
    taggedFriends: [],
  },
  {
    id: 'moment-4',
    user_id: currentUser.id,
    title: 'Окно поезда',
    description: 'Ночной путь и ощущения, которые лучше всего сохраняются в тишине.',
    mood: '🥹',
    location: 'Самарканд',
    photo_url: photos.train,
    song_title: 'Night Drive',
    song_artist: 'Chromatics',
    song_cover: covers.city,
    visibility: 'friends',
    created_at: '2026-04-10T08:10:00.000Z',
    moment_at: '2026-04-10T23:30:00.000Z',
    people: [],
    taggedFriends: [],
  },
]

const capsule = [moments[0], moments[1], moments[2], moments[3]]

export function ensureTutorialTelegram() {
  if (typeof window === 'undefined') return

  if (!window.Telegram) window.Telegram = {}
  if (!window.Telegram.WebApp) {
    window.Telegram.WebApp = {
      ready() {},
      expand() {},
      close() {},
      showAlert() {},
      openTelegramLink() {},
      initDataUnsafe: { user: { id: currentUser.telegram_id, first_name: currentUser.name } },
      HapticFeedback: { impactOccurred() {} },
    }
  }
}

export function seedTutorialStore() {
  useAppStore.setState({
    currentUser,
    initDone: true,
    isNew: false,
    isOnboarded: true,
    people,
    moments,
    capsule,
    friends,
    incomingRequests,
    heroTransition: null,
    recentSongs: [],
    recentLocations: ['Ташкент', 'Чарвак', 'Самарканд'],
  })
}

export function getTutorialCard(cardId) {
  return tutorialCards.find((card) => card.id === cardId) ?? tutorialCards[0]
}

export function getAddMomentProps(screen) {
  const common = {
    initialTitle: 'Ужин на крыше',
    initialBody: 'Сохраняю этот вечер, чтобы потом снова услышать музыку, запах ветра и наш смех.',
    initialMood: '🥹',
    initialLocation: 'Ташкент, крыша дома',
    initialMomentDate: '2026-04-24',
    initialSong: {
      name: 'Bloom',
      artist: 'The Paper Kites',
      cover: covers.bloom,
    },
    initialPhotoPreview: photos.sunset,
    initialPeopleIds: ['person-1', 'person-2'],
    initialTaggedFriendIds: ['friend-3'],
    initialVisibility: 'friends',
  }

  if (screen === 'add-social') {
    return {
      ...common,
      initialScrollTop: 620,
    }
  }

  return common
}
