// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { buildQuestionsInputJson, getYouTubeId, toAbsoluteContentUrl } from './courseBuilderHelpers'

describe('courseBuilderHelpers', () => {
  it('getYouTubeId parses common URL shapes', () => {
    expect(getYouTubeId('not-a-valid-url-[bad')).toBeNull()
    expect(getYouTubeId('')).toBeNull()
    expect(getYouTubeId('https://youtu.be/abcDEFgh12')).toBe('abcDEFgh12')
    expect(getYouTubeId('https://www.youtube.com/watch?v=ZZ_vid_12')).toBe('ZZ_vid_12')
    expect(getYouTubeId('https://www.youtube.com/embed/EMBEDIDHERE')).toBe('EMBEDIDHERE')
    expect(getYouTubeId('https://www.youtube.com/shorts/SHORTSID1')).toBe('SHORTSID1')
    expect(getYouTubeId('not a url v=FallbackId12')).toBe('FallbackId12')
  })

  it('toAbsoluteContentUrl resolves API base for relative paths', () => {
    expect(toAbsoluteContentUrl('')).toBe('')
    expect(toAbsoluteContentUrl('https://cdn/x')).toBe('https://cdn/x')
    expect(toAbsoluteContentUrl('/media/a.pdf')).toContain('/media/a.pdf')
  })

  it('buildQuestionsInputJson builds backend JSON', () => {
    const json = buildQuestionsInputJson([
      { text: 'Q1', options: ['Paris', 'London'], correctIndices: [0] },
      { text: 'Q2', options: ['x', '', 'y', 'z'], correctIndices: [2, 3], multiSelect: true },
    ])
    const parsed = JSON.parse(json) as Array<{ correct_option: string; option_b: string; allow_multiple_correct: boolean }>
    expect(parsed[0].correct_option).toBe('a')
    expect(parsed[0].allow_multiple_correct).toBe(false)
    // blank options are dropped, so index 2 / 3 map to letters b / c
    expect(parsed[1].option_b).toBe('y')
    expect(parsed[1].correct_option).toBe('b,c')
    expect(parsed[1].allow_multiple_correct).toBe(true)
  })
})
