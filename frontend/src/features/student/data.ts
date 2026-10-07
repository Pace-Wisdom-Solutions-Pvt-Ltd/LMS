// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Mock data for Student Home flow (UI only).
 */
export interface CourseSection {
  id: string
  title: string
  progress: number
  lessons?: string[]
  note?: string
}


export interface StudentCourse {
  id: string
  code: string
  title: string
  description: string
  sections: CourseSection[]
}

export interface StudentProgram {
  id: string
  name: string
  description: string
  courses: StudentCourse[]
}

export const MOCK_PROGRAMS: StudentProgram[] = [
  {
    id: 'adv-js',
    name: 'Advanced JS',
    description:
      'Advanced JavaScript training dives into complex concepts like closures, promises, async/await, and event loops. It also covers ES6+ features,',
    courses: [
      {
        id: 'adv-js-c01',
        code: 'Advanced JS_C01',
        title: 'Advanced Js Upskill',
        description: 'Deep dive into modern JavaScript.',
        sections: [
          {
            id: 's1',
            title: 'Javascript Course Part 1',
            progress: 100,
            lessons: [
              'What is Javascript?',
              'Overview of Javascript',
              'Trouble shooting Javascript',
              'Javascript Variables',
            ],
            note: 'Note : Watch ONLY 1-5 Chapters from the below courses.',
          },
          { id: 's2', title: 'Quiz 1', progress: 100 },
          { id: 's3', title: 'Project', progress: 100 },
          { id: 's4', title: 'Advance Javascript', progress: 100 },
        ],
      },
    ],
  },
  {
    id: 'html',
    name: 'HTML Upskill',
    description:
      'HTML Upskill training strengthens knowledge of HTML5 elements, semantic tags, forms, tables, and multimedia integration. It emphasizes',
    courses: [
      {
        id: 'html-c01',
        code: 'HTML_C01',
        title: 'HTML Fundamentals',
        description: 'Core HTML5 and semantics.',
        sections: [
          { id: 's1', title: 'HTML Basics', progress: 80 },
          { id: 's2', title: 'Quiz 1', progress: 0 },
        ],
      },
    ],
  },
  {
    id: 'general',
    name: 'General',
    description:
      'General training programs cover a broad range of foundational topics relevant across roles, such as company policies, compliance,',
    courses: [
      {
        id: 'gen-c01',
        code: 'GEN_C01',
        title: 'General Orientation',
        description: 'Company policies and compliance overview.',
        sections: [
          { id: 's1', title: 'Introduction', progress: 0 },
        ],
      },
    ],
  },
]
