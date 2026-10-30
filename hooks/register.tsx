import type { Register } from 'claude-code'

const TTL_MS = 5 * 60 * 1000

type Limit = { kind: string; percentUsed: number; resetsAt?: string }
let limits: Limit[] = []
let lastTurnAt = 0
let now = 0
let drawn = ''

// green -> yellow -> amber -> red by how much is used
const tone = (used: number) =>
  used >= 90 ? '#ef4444' : used >= 70 ? '#f59e0b' : used >= 50 ? '#eab308' : '#22c55e'

const cacheState = () => {
  if (!lastTurnAt) return { name: 'COLD', c: '#60a5fa', speed: '' }
  const age = now - lastTurnAt
  if (age < 60_000) return { name: 'HOT', c: '#ef4444', speed: '0.9s' }
  if (age < TTL_MS) return { name: 'WARM', c: '#f59e0b', speed: '2.4s' }
  return { name: 'COLD', c: '#60a5fa', speed: '' }
}

// one cell per 10%, coloured by where it sits on the scale (like a heat map)
const CELLS = 10
const cellTone = (i: number) => (i >= 8 ? '#ef4444' : i >= 7 ? '#f59e0b' : i >= 5 ? '#eab308' : '#22c55e')

const seg = (x: number, w: number, label: string, l: Limit | undefined) => {
  const used = l ? Math.min(100, l.percentUsed) : 0
  const c = l ? tone(used) : '#6b7280'
  const barX = x + 98
  const size = 8
  const gap = 3
  const full = used / 10
  const cells = Array.from({ length: CELLS }, (_, i) => {
    const fill = Math.max(0, Math.min(1, full - i))
    const cx = barX + i * (size + gap)
    const base = `<rect x="${cx}" y="12" width="${size}" height="${size}" rx="2.5" fill="#6b7280" opacity="0.3"/>`
    if (fill <= 0) return base
    const isLast = full - i <= 1
    const pulse = isLast && used >= 70
      ? `<animate attributeName="opacity" values="${fill};${fill * 0.35};${fill}" dur="${used >= 90 ? '0.9s' : '2.4s'}" repeatCount="indefinite"/>`
      : ''
    return `${base}<rect x="${cx}" y="12" width="${size}" height="${size}" rx="2.5" fill="${cellTone(i)}" opacity="${fill}">${pulse}</rect>`
  }).join('')
  return `
  <text x="${x}" y="20" fill="#9ca3af" font-size="13" font-family="system-ui,sans-serif">${label}</text>
  ${cells}
  <text x="${x + 218}" y="20" fill="${c}" font-size="13" font-weight="600" font-family="system-ui,sans-serif">${l ? Math.round(used) + '% used' : '–'}</text>`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.clock.every(5000, async () => {
      now = await $.clock.now()
      try {
        limits = (await $.session.usage()).rateLimits
      } catch {}
      const s = limits.map(l => `${l.kind}${Math.round(l.percentUsed)}`).join() + cacheState().name
      if (s !== drawn) $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    limits = e.rateLimits
    now = await $.clock.now()
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    lastTurnAt = await $.clock.now()
    now = lastTurnAt
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Svg } = $.ui.resolve(e)
    const session = limits.find(l => l.kind === 'five_hour')
    const week = limits.find(l => l.kind === 'seven_day')
    const k = cacheState()
    drawn = limits.map(l => `${l.kind}${Math.round(l.percentUsed)}`).join() + k.name
    const W = 800
    const nameW = k.name === 'HOT' ? 34 : k.name === 'WARM' ? 54 : 46
    const dot = k.speed
      ? `<animate attributeName="r" values="4;7;4" dur="${k.speed}" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.45;1" dur="${k.speed}" repeatCount="indefinite"/>`
      : ''
    const line = (x: number) => `<line x1="${x}" y1="4" x2="${x}" y2="28" stroke="#6b7280" stroke-opacity="0.5" stroke-width="1"/>`
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 32" width="${W}" height="32">
  ${seg(8, 280, 'Session (5h)', session)}
  ${line(304)}
  ${seg(320, 280, 'Weekly (7d)', week)}
  ${line(616)}
  <text x="632" y="20" fill="#9ca3af" font-size="13" font-family="system-ui,sans-serif">Cache</text>
  <circle cx="${W - 10 - nameW - 12}" cy="16" r="5" fill="${k.c}">${dot}</circle>
  <text x="${W - 10}" y="21" fill="${k.c}" font-size="15" font-weight="700" text-anchor="end" font-family="system-ui,sans-serif">${k.name}</text>
</svg>`
    return (
      <Box>
        <Svg
          source={source}
          width={W}
          height={32}
          alt={`Session ${session ? Math.round(100 - session.percentUsed) : '?'}% left, weekly ${week ? Math.round(100 - week.percentUsed) : '?'}% left, prompt cache ${k.name}`}
          isInteractive
        />
      </Box>
    )
  })
}
