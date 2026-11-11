# Current Task

Goal (unattended backlog 6, small screens): on a 390 px phone the sticky top bar took three lines (about 145 of 844 px) over every lesson.

Files: `viewer/src/App.tsx`.

Plan: on phones the scene path goes to its own line under the logo and the buttons, Present and Export show only their icons (named by `aria-label`), and the connection text is screen-reader only; from `sm` up nothing changes.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 136/136, viewer 65/65. Example lesson in Chromium: at 390 px the bar is about 105 px (logo and icon buttons, then the path and badge); at 1440 px it is unchanged. No console errors.
