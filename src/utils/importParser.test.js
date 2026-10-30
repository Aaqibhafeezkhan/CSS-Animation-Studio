import { describe, expect, it } from 'vitest'
import { importParser } from './importParser.js'

describe('importParser', () => {
  it('imports supported keyframes and emits only allow-listed declarations', () => {
    const [animation] = importParser('@keyframes float { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }')
    expect(animation.name).toBe('float')
    expect(animation.animatedProperties).toEqual(expect.arrayContaining(['opacity', 'transform']))
    expect(animation.css).toContain('@keyframes float')
  })

  it('rejects non-keyframes at-rules and unsafe CSS values', () => {
    expect(() => importParser('@import url(https://example.com/a.css); @keyframes x { to { opacity: 1; } }')).toThrow()
    expect(() => importParser('@keyframes x { to { background: url(javascript:alert(1)); } }')).toThrow()
  })

  it('rejects oversized and empty input', () => {
    expect(() => importParser('')).toThrow()
    expect(() => importParser('x'.repeat(65537))).toThrow()
  })

  it('ignores unsupported CSS properties rather than copying them', () => {
    const [animation] = importParser('@keyframes safe { to { opacity: 1; position: fixed; } }')
    expect(animation.css).not.toContain('position: fixed')
  })
})
