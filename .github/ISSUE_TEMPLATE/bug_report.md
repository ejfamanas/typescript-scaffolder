name: Bug Report
description: File a bug report
title: "[Bug] "
labels: [bug]
body:
- type: textarea
  attributes:
    label: Description
    description: What’s the bug? Be concise and specific.

- type: textarea
  attributes:
    label: Reproduction Steps
    description: Steps or code to reproduce the issue.

- type: textarea
  attributes:
    label: Expected vs. Actual
    description: What did you expect to happen? What actually happened?

- type: input
  attributes:
    label: Environment
    placeholder: e.g., macOS, Node 18.12.1, TypeScript 5.3