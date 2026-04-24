import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { tutorialCardOrder } from '../src/tutorial/demoData.js'

const projectRoot = process.cwd()
const distDir = path.join(projectRoot, 'dist')
const outputDir = path.join(projectRoot, 'supabase', 'functions', 'telegram-webhook', 'assets')
const browserProfileDir = path.join(projectRoot, '.tmp-tutorial-browser', `${Date.now()}-${process.pid}`)

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}`)
  }
}

function findBrowser() {
  const envBrowser = process.env.TUTORIAL_BROWSER?.trim()
  const candidates = [
    ...(envBrowser ? [envBrowser] : []),
    ...(process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
      : [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
        ]),
  ]

  for (const candidate of candidates) {
    try {
      spawnSync(candidate, ['--version'], { stdio: 'ignore' })
      return candidate
    } catch {
      // Try next browser candidate.
    }
  }

  throw new Error('No supported Chromium browser was found for tutorial screenshots.')
}

async function prepareLocalTutorialHtml() {
  const tutorialHtmlPath = path.join(distDir, 'tutorial.html')
  const tutorialAppHtmlPath = path.join(distDir, 'tutorial-app.html')

  for (const htmlPath of [tutorialHtmlPath, tutorialAppHtmlPath]) {
    const source = await readFile(htmlPath, 'utf8')
    const localSource = source.replaceAll('"/assets/', '"./assets/')
    await writeFile(htmlPath, localSource, 'utf8')
  }
}

async function main() {
  const browser = findBrowser()
  const requestedCards = (process.env.TUTORIAL_CARD_IDS ?? '')
    .split(',')
    .map((card) => card.trim())
    .filter(Boolean)
  const cardsToRender = requestedCards.length > 0 ? requestedCards : tutorialCardOrder

  await mkdir(outputDir, { recursive: true })
  await mkdir(browserProfileDir, { recursive: true })
  await stat(path.join(distDir, 'tutorial.html'))
  await stat(path.join(distDir, 'tutorial-app.html'))
  await prepareLocalTutorialHtml()

  for (const cardId of cardsToRender) {
    const outputPath = path.join(outputDir, `tutorial-${cardId}.png`)
    const url = `${pathToFileURL(path.join(distDir, 'tutorial.html')).href}?card=${encodeURIComponent(cardId)}`

    console.log(`[tutorial:cards] rendering ${cardId}`)

    run(browser, [
      '--headless=new',
      `--user-data-dir=${browserProfileDir}`,
      '--disable-gpu',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--disable-component-update',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=8000',
      '--window-size=1080,1440',
      `--screenshot=${outputPath}`,
      url,
    ])
  }
}

main().catch((error) => {
  console.error('[tutorial:cards]', error)
  process.exit(1)
})
