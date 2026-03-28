# Intake Pipeline

## Goal
Turn inbound email + attachments into tracked COI records with as little manual work as possible while still preserving a review step for uncertain cases.

## First-pass pipeline
1. Pull inbound message from client mailbox
2. Store message metadata and attachments
3. Detect certificate-like attachments
4. Extract text (native PDF text first, OCR fallback second)
5. Parse fields from the extracted text
6. Match candidate entity by email/name/property clues
7. Decide if the document is:
   - new
   - renewal
   - duplicate
   - needs review
8. If accepted, set active certificate + schedule reminders
9. If uncertain, create review queue item

## Confidence routing
- High confidence: auto-link and schedule
- Medium confidence: create suggested match for review
- Low confidence: inbox exception / manual review required

## MVP shortcuts
- Start with PDF text extraction before image-heavy OCR sophistication
- Allow manual entity selection in review queue
- Keep a copy of raw extracted text for debugging and audit

## Demo posture
For early demos, use seeded entities plus mock extracted certificate text so the dashboard can be shown before live mailbox integration is done.
