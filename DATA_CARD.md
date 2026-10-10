# Synthetic Dataset Card

## Purpose

This dataset demonstrates grounded university-policy retrieval, deterministic student tools, source precedence, auditability, and safe hypothetical evaluation.

## Student data

All 30 students are synthetic (`S1001`–`S1030`), across BTECH_CSE and BTECH_ECE, admission batches 2023 and 2024. It includes six courses, attendance, results, CGPA, and backlog edge cases.

## Document data

Synthetic regulations, examination rules, attendance circulars, and a department notice include versions, effective dates, authority levels, and a supersession relationship. They are not real university policy.

## Privacy and limitations

No real personal data is used. These documents and decisions are demo-only and must not be used for actual academic decisions.

## Reproducibility

Run `...python scripts/generate_students.py`, then `python scripts/validate_students.py`.
