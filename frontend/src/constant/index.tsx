// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

type SubmissionFormat = "link" | "paragraph" | "pdf" | "screenshot";

const LANG_OPTIONS = [
  { value: "C++", label: "C++" },
  { value: "JavaScript", label: "JavaScript" },
  { value: "Python", label: "Python" },
  { value: "SQL", label: "SQL" },
  { value: "C", label: "C" },
  { value: "C#", label: "C#" },
  { value: "Java", label: "Java" },
];

const SUBMISSION_FORMATS: { id: SubmissionFormat; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "paragraph", label: "Paragraph" },
  { id: "pdf", label: "PDF" },
  { id: "screenshot", label: "Screenshot" },
];

export { LANG_OPTIONS, SUBMISSION_FORMATS };
