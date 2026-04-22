import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canShareFiles, createCanvasFile, getCardFilename, shouldUseShareFallback, triggerBrowserDownload } from '../cardExport'

describe('cardExport helpers', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: vi.fn(),
    })

    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true),
    })

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        callback()
        return 1
      }),
    })

    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:card'),
    })

    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds a stable filename from the moment id', () => {
    expect(getCardFilename('1234567890abcdef')).toBe('memi-12345678.jpg')
    expect(getCardFilename()).toBe('memi-moment.jpg')
  })

  it('marks Telegram mobile webviews for share fallback', () => {
    expect(shouldUseShareFallback({ platform: 'ios' })).toBe(true)
    expect(shouldUseShareFallback({ platform: 'android' })).toBe(true)
    expect(shouldUseShareFallback({ platform: 'tdesktop' })).toBe(false)
  })

  it('checks file-sharing support safely', () => {
    expect(canShareFiles([new File(['x'], 'card.jpg', { type: 'image/jpeg' })])).toBe(true)

    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('unsupported')
      }),
    })

    expect(canShareFiles([new File(['x'], 'card.jpg', { type: 'image/jpeg' })])).toBe(false)
  })

  it('creates a jpeg file from canvas output', async () => {
    const canvas = {
      toBlob: vi.fn((resolve, type, quality) => {
        expect(type).toBe('image/jpeg')
        expect(quality).toBe(0.92)
        resolve(new Blob(['image'], { type }))
      }),
    }

    const file = await createCanvasFile(canvas, 'card.jpg')

    expect(file).toBeInstanceOf(File)
    expect(file?.name).toBe('card.jpg')
    expect(file?.type).toBe('image/jpeg')
  })

  it('downloads through a temporary object URL', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const file = new File(['image'], 'card.jpg', { type: 'image/jpeg' })

    triggerBrowserDownload(file)

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(file)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:card')
    expect(document.body.querySelector('a')).toBeNull()
  })
})
