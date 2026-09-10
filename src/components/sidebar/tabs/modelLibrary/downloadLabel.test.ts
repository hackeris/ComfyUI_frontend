import { describe, expect, it } from 'vitest'

import { getDownloadLabel } from './downloadLabel'

describe('getDownloadLabel', () => {
  it('取路径末两段', () => {
    expect(getDownloadLabel('/mnt/models/checkpoints')).toBe(
      'models/checkpoints'
    )
    expect(getDownloadLabel('C:\\Users\\x\\models\\loras')).toBe('models/loras')
  })

  it('单段路径原样返回(不产生 undefined/)', () => {
    expect(getDownloadLabel('checkpoints')).toBe('checkpoints')
  })

  it('空串返回空', () => {
    expect(getDownloadLabel('')).toBe('')
  })
})
