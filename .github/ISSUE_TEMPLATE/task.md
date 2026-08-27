---
name: Task
about: Task untuk agent (Claude Code / Cline / Antigravity)
title: ''
labels: ''
assignees: ''
---

## Tujuan
(satu kalimat)

## Agent
(Claude Code / Cline / Antigravity)

## File yang boleh disentuh
- server/ai/parseMessage.js

## Test yang harus ditulis DULUAN
- [ ] "makan siang 35rb" → amount 35000, type expense
- [ ] "gaji masuk 8jt" → amount 8000000, type income
- [ ] input tanpa angka → tidak insert, minta klarifikasi

## Acceptance Criteria
- [ ] Bentuk output sesuai ARCHITECTURE.md §4 (contoh output parser)
- [ ] Coverage file ini >= 90%
- [ ] npm test hijau

## Referensi
- SPEC.md §5 aturan bisnis, §8 format input
- ARCHITECTURE.md §4 kontrak output parser