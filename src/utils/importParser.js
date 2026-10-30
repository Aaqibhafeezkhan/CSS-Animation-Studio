import { nanoid } from 'nanoid'

const KNOWN_PROPS = new Set([
  'transform', 'opacity', 'background', 'background-color', 'color',
  'filter', 'box-shadow', 'border-color', 'width', 'height', 'top',
  'left', 'right', 'bottom', 'margin', 'padding', 'border-radius',
  'font-size', 'letter-spacing', 'clip-path', 'd', 'stroke-dashoffset',
  'stroke', 'fill', 'scale', 'rotate', 'translate',
])
const MAX_IMPORT_LENGTH = 65536
const MAX_ANIMATIONS = 50
const MAX_STOPS = 100

function extractBlocks(css) {
  const blocks = []
  const header = /@keyframes\s+([a-zA-Z_][\w-]*)\s*\{/g
  let match
  let previousEnd = 0
  while ((match = header.exec(css)) !== null) {
    let depth = 1
    let index = header.lastIndex
    const start = match.index
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1
      else if (css[index] === '}') depth -= 1
      index += 1
    }
    if (depth !== 0) throw new Error('A keyframes block is missing its closing brace.')
    blocks.push({ name: match[1], body: css.slice(header.lastIndex, index - 1) })
    previousEnd = index
    header.lastIndex = index
    if (blocks.length > MAX_ANIMATIONS) throw new Error('Import up to 50 animations at a time.')
  }
  if (!blocks.length) throw new Error('No valid @keyframes blocks found in the provided CSS.')
  return blocks
}

function parseDeclarations(body) {
  const declarations = {}
  body.split(';').forEach(part => {
    const separator = part.indexOf(':')
    if (separator < 1) return
    const property = part.slice(0, separator).trim().toLowerCase()
    const value = part.slice(separator + 1).trim()
    if (!KNOWN_PROPS.has(property) || !value) return
    if (/[{}<>\u0000-\u001f]/.test(value) || /url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:|-moz-binding/i.test(value)) {
      throw new Error('The imported CSS contains an unsafe value for ' + property + '.')
    }
    declarations[property] = value.slice(0, 500)
  })
  return declarations
}

function parseAnimation(name, body) {
  const keyframes = {}
  const stopPattern = /(from|to|(?:100|[0-9]{1,2})(?:\.\d+)?%)(?:\s*,\s*(from|to|(?:100|[0-9]{1,2})(?:\.\d+)?%))*\s*\{([^{}]*)\}/g
  let match
  while ((match = stopPattern.exec(body)) !== null) {
    const selector = match[0].slice(0, match[0].indexOf('{')).trim()
    const declarations = parseDeclarations(match[3])
    if (!Object.keys(declarations).length) continue
    selector.split(',').forEach(raw => {
      const value = raw.trim()
      const percentage = value === 'from' ? 0 : value === 'to' ? 100 : Number.parseFloat(value)
      if (Number.isFinite(percentage) && percentage >= 0 && percentage <= 100) keyframes[percentage + '%'] = declarations
    })
  }
  const stops = Object.keys(keyframes)
  if (!stops.length) return null
  if (stops.length > MAX_STOPS) throw new Error('An animation can contain no more than 100 keyframe stops.')
  const properties = [...new Set(Object.values(keyframes).flatMap(stop => Object.keys(stop)))]
  const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 60) || 'imported'
  const keyframeCss = '@keyframes ' + safeName + ' {\n' + stops
    .sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))
    .map(stop => '  ' + stop + ' { ' + Object.entries(keyframes[stop]).map(([key, value]) => key + ': ' + value + ';').join(' ') + ' }')
    .join('\n') + '\n}'
  const now = new Date().toISOString()
  const className = 'custom-' + safeName
  const css = keyframeCss + '\n\n.' + className + '-el { animation: ' + safeName + ' 1s ease infinite; }'
  return {
    id: 'custom-' + nanoid(8),
    name: name.slice(0, 80),
    slug: className,
    category: 'custom',
    tags: ['custom', 'imported'],
    description: 'Imported animation: ' + name.slice(0, 80),
    longDescription: 'Imported keyframes animate ' + properties.join(', ') + '.',
    addedAt: now,
    updatedAt: now,
    author: 'Imported',
    browserSupport: { chrome: 43, firefox: 16, safari: 9, edge: 12 },
    performanceScore: 7,
    complexityScore: 2,
    animatedProperties: properties,
    triggerType: 'auto',
    css,
    html: '<div class="' + className + '-el">Preview</div>',
    js: null,
    keyframes,
    variants: [
      { name: 'Fast', css: keyframeCss + '\n\n.' + className + '-el { animation: ' + safeName + ' 0.5s ease infinite; }' },
      { name: 'Slow', css: keyframeCss + '\n\n.' + className + '-el { animation: ' + safeName + ' 2s ease infinite; }' },
    ],
    relatedIds: [],
  }
}

export function importParser(rawCss) {
  if (typeof rawCss !== 'string' || !rawCss.trim()) throw new Error('Paste CSS containing one or more @keyframes blocks.')
  if (rawCss.length > MAX_IMPORT_LENGTH) throw new Error('CSS imports must be 64 KB or smaller.')
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '')
  if (/@(?!keyframes\b)[\w-]+/i.test(css)) throw new Error('Only @keyframes rules are supported in imported CSS.')
  const animations = extractBlocks(css).map(({ name, body }) => parseAnimation(name, body)).filter(Boolean)
  if (!animations.length) throw new Error('No supported keyframe declarations were found.')
  return animations
}
