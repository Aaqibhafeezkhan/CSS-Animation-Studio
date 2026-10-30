import { describe, expect, it } from 'vitest'
import { buildBundle } from './buildBundle.js'

describe('buildBundle', () => {
  it('rejects an empty selection', () => {
    expect(() => buildBundle([])).toThrow('No animations selected')
  })

  it('deduplicates matching keyframes and includes requested variables', () => {
    const animation = {
      name: 'Pulse',
      css: '.pulse { animation: pulse 1s infinite; } @keyframes pulse { from { opacity: 0; } to { opacity: 1; } }',
    }
    const output = buildBundle([animation, animation], { '--motion-speed': '1' })
    expect(output.match(/@keyframes pulse/g)).toHaveLength(1)
    expect(output).toContain('--motion-speed: 1;')
    expect(output).toContain('.pulse')
  })
})
