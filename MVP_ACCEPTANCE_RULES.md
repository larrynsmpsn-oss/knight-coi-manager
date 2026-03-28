# Knight COI Manager MVP Acceptance Rules

## Goal
Make "accept this COI" explicit for the MVP so review decisions are consistent and testable.

## Blocking requirements
A certificate should **not** be accepted for MVP processing if any of these are missing:
- attachment does not look like a certificate
- no entity has been resolved
- insured name is missing
- expiration date is missing/unparseable
- certificate holder is missing
- policy number is missing

## Warning-only issues
These should not block MVP acceptance yet, but they should be visible for review and future compliance tightening:
- effective date missing
- producer name missing
- carrier summary missing
- no parsed coverage lines
- certificate holder does not appear to match the expected holder/client

## Why this split
For Knight’s first MVP, the system needs to be practical:
- strict enough to avoid accepting obvious garbage
- not so strict that it rejects usable real-world COIs because extraction is imperfect

## Planned next step
Surface blocking issues + warnings in the review API/UI so a reviewer can see exactly why a document can or cannot be accepted.
