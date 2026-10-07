// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  getApiNodeInfo,
  getResFileAccept,
  getSubmitLabel,
  inferApiNodeContentType,
  localItemBadge,
  localItemTitle,
  normalizeDraftQuestionCorrectOptionIds,
} from '../course-builder/courseBuilderProgramHelpers'
import {
  renderApiNodePreview,
  renderLocalResourcePreview,
} from '../course-builder/courseBuilderContentPreview'
import type { ApiNodeInfo, LocalCurriculumItem } from '../course-builder/courseBuilderProgramHelpers'
import type { ApiModuleNode } from '@/lib/api/organizations'
import type { ProgramResource } from '../store'

describe('CourseBuilderProgramInner helpers', () => {
  it('getResFileAccept returns expected accept string', () => {
    expect(getResFileAccept('pdf')).toBe('.pdf')
    expect(getResFileAccept('video')).toBe('video/*')
    expect(getResFileAccept('link')).toBeUndefined()
  })

  it('getSubmitLabel returns add/save/saving label', () => {
    expect(getSubmitLabel({ saving: false, editing: false, addLabel: 'Add', saveLabel: 'Save' })).toBe('Add')
    expect(getSubmitLabel({ saving: false, editing: true, addLabel: 'Add', saveLabel: 'Save' })).toBe('Save')
    expect(getSubmitLabel({ saving: true, editing: false, addLabel: 'Add', saveLabel: 'Save' })).toBe('Saving…')
    expect(getSubmitLabel({ saving: true, editing: false, addLabel: 'Add', saveLabel: 'Save', savingLabel: 'Please wait' })).toBe('Please wait')
  })

  it('normalizeDraftQuestionCorrectOptionIds keeps valid ids or falls back to first option', () => {
    expect(normalizeDraftQuestionCorrectOptionIds({ options: [], correctOptionIds: ['x'] })).toEqual(['x'])

    expect(
      normalizeDraftQuestionCorrectOptionIds({
        options: [{ id: 'a' }, { id: 'b' }],
        correctOptionIds: ['b'],
      })
    ).toEqual(['b'])

    expect(
      normalizeDraftQuestionCorrectOptionIds({
        options: [{ id: 'a' }, { id: 'b' }],
        correctOptionIds: ['missing'],
      })
    ).toEqual(['a'])

    expect(
      normalizeDraftQuestionCorrectOptionIds({
        options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        correctOptionIds: ['a', 'c'],
      })
    ).toEqual(['a', 'c'])
  })

  it('inferApiNodeContentType infers from url when raw type missing', () => {
    expect(inferApiNodeContentType('pdf', 'https://x/y')).toBe('pdf')
    expect(inferApiNodeContentType('', 'https://x/y/file.PDF?x=1')).toBe('pdf')
    expect(inferApiNodeContentType('', 'https://x/y/file.docx')).toBe('doc')
    expect(inferApiNodeContentType('', 'https://x/y/file.webm')).toBe('video')
    expect(inferApiNodeContentType('', 'https://x/y/file.unknown')).toBe('')
  })

  it('getApiNodeInfo derives flags, badge, title and preview behavior', () => {
    const taskNode = {
      title: 'Week 1',
      task_title: 'Task 1',
      content_url: 'https://example.com/a.pdf',
    } as ApiModuleNode
    const taskInfo = getApiNodeInfo(taskNode)
    expect(taskInfo.isTask).toBe(true)
    expect(taskInfo.badge.label).toBe('Task')
    expect(taskInfo.displayTitle).toBe('Task 1')
    expect(taskInfo.inferred).toBe('pdf')

    const quizNode = {
      title: 'Quiz',
      quiz_name: 'Quiz 9',
      content_url: 'https://example.com/vid.mp4',
    } as ApiModuleNode
    const quizInfo = getApiNodeInfo(quizNode)
    expect(quizInfo.isQuiz).toBe(true)
    expect(quizInfo.badge.label).toBe('Quiz')
    expect(quizInfo.displayTitle).toBe('Quiz 9')
    expect(quizInfo.showVideo).toBe(true)
  })

  it('getApiNodeInfo falls back to learning_material fields and infers type from URL', () => {
    const node = {
      title: 'PDF Thing',
      learning_material: {
        content_type: '',
        content_url: 'https://example.com/file.pdf?x=1',
      },
    } as ApiModuleNode
    const info = getApiNodeInfo(node)
    expect(info.inferred).toBe('pdf')
    expect(info.effectiveUrl).toContain('file.pdf')
    expect(info.badge.label).toBe('Resource')
  })

  it('getApiNodeInfo detects youtube and sets thumbnail', () => {
    const node = {
      title: 'YT',
      content_type: 'link',
      content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    } as ApiModuleNode
    const info = getApiNodeInfo(node)
    expect(info.thumb).toContain('img.youtube.com')
    expect(info.showVideo).toBe(true)
  })

  it('localItem helpers create badge and title', () => {
    expect(localItemBadge('Resource').label).toBe('Resource')
    expect(localItemBadge('Task').label).toBe('Task')
    expect(localItemBadge('Assessment').label).toBe('Assessment')

    expect(localItemTitle({ __itemType: 'Resource', title: 'R' } as LocalCurriculumItem)).toBe('R')
    expect(localItemTitle({ __itemType: 'Task', title: 'T' } as LocalCurriculumItem)).toBe('T')
    expect(localItemTitle({ __itemType: 'Assessment', name: 'Q' } as LocalCurriculumItem)).toBe('Q')
  })

  it('renderLocalResourcePreview renders by resource type', () => {
    render(<>{renderLocalResourcePreview({ type: 'pdf', title: 'PDF', url: 'https://x/y.pdf' } as ProgramResource)}</>)
    expect(screen.getByTitle(/pdf preview/i)).toBeTruthy()

    render(<>{renderLocalResourcePreview({ type: 'video', title: 'V', url: 'https://x/y.mp4' } as ProgramResource)}</>)
    expect(screen.getByTitle(/open content/i)).toBeTruthy()
  })

  it('renderApiNodePreview renders video/pdf/doc variations', () => {
    const videoInfo = {
      showVideo: true,
      effectiveUrl: 'https://example.com/watch?v=1',
      inferred: 'video',
      thumb: null,
    } as ApiNodeInfo
    render(<>{renderApiNodePreview(videoInfo, 'Video')}</>)
    expect(screen.getByTitle('Open content')).toBeTruthy()

    const pdfInfo = {
      showVideo: false,
      effectiveUrl: 'https://example.com/a.pdf',
      inferred: 'pdf',
      thumb: null,
    } as ApiNodeInfo
    render(<>{renderApiNodePreview(pdfInfo, 'PDF')}</>)
    expect(screen.getByTitle('PDF preview')).toBeTruthy()

    const docInfo = {
      showVideo: false,
      effectiveUrl: 'https://example.com/a.doc',
      inferred: 'doc',
      thumb: null,
    } as ApiNodeInfo
    render(<>{renderApiNodePreview(docInfo, 'DOC')}</>)
    expect(screen.getByTitle('Open document')).toBeTruthy()
  })

  it('renderApiNodePreview returns null when it cannot render', () => {
    const docInfoNoUrl = { showVideo: false, effectiveUrl: '', inferred: 'doc', thumb: null } as ApiNodeInfo
    render(<>{renderApiNodePreview(docInfoNoUrl, 'Doc')}</>)
    expect(screen.queryByTitle(/open document/i)).toBeNull()

    const unknownInfo = { showVideo: false, effectiveUrl: '', inferred: '', thumb: null } as ApiNodeInfo
    render(<>{renderApiNodePreview(unknownInfo, 'X')}</>)
    expect(screen.queryByTitle(/open content/i)).toBeNull()
  })
})

