import { execFileSync } from 'node:child_process';
import { normalizeAppleMailMessage } from './mailbox-adapters.js';

function escapeAppleScriptString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildAppleMailExportScript({ subjectContains = '', senderContains = '', limit = 10 } = {}) {
  const safeSubject = escapeAppleScriptString(subjectContains);
  const safeSender = escapeAppleScriptString(senderContains);
  const safeLimit = Math.max(1, Number(limit) || 10);

  return `
set maxCount to ${safeLimit}
set subjectFilter to "${safeSubject}"
set senderFilter to "${safeSender}"
set outputLines to {}

tell application "Mail"
  set matchedMessages to {}
  repeat with acct in every account
    try
      -- Try to access INBOX mailbox
      set inboxMbox to mailbox "INBOX" of acct
      repeat with m in (messages of inboxMbox)
        try
          set subjectMatches to (subjectFilter is "" or (subject of m as text) contains subjectFilter)
          set senderMatches to (senderFilter is "" or (sender of m as text) contains senderFilter)
          if subjectMatches and senderMatches then
            set end of matchedMessages to m
          end if
        end try
      end repeat
    on error
      -- Account might not have INBOX, skip it
    end try
  end repeat

  set matchedMessages to reverse of matchedMessages
  if (count of matchedMessages) > maxCount then
    set matchedMessages to items 1 thru maxCount of matchedMessages
  end if

  repeat with m in matchedMessages
    set attachmentParts to {}
    repeat with a in mail attachments of m
      try
        set attachmentName to my sanitizeField(name of a as text)
        set attachmentType to my sanitizeField(MIME type of a as text)
        set end of attachmentParts to attachmentName & "::" & attachmentType
      end try
    end repeat

    set AppleScript's text item delimiters to "||"
    set attachmentsText to attachmentParts as text
    set AppleScript's text item delimiters to ""

    set end of outputLines to (my sanitizeField((id of m as text)) & tab & my sanitizeField(sender of m as text) & tab & my sanitizeField(subject of m as text) & tab & my sanitizeField(content of m as text) & tab & my sanitizeField((date received of m as text)) & tab & attachmentsText)
  end repeat
end tell

set AppleScript's text item delimiters to linefeed
return outputLines as text

on sanitizeField(inputText)
  set textValue to inputText as text
  set textValue to my replaceText(return, " ", textValue)
  set textValue to my replaceText(linefeed, " ", textValue)
  set textValue to my replaceText(tab, " ", textValue)
  return textValue
end sanitizeField

on replaceText(findText, replaceText, sourceText)
  set AppleScript's text item delimiters to findText
  set textItems to every text item of sourceText
  set AppleScript's text item delimiters to replaceText
  set newText to textItems as text
  set AppleScript's text item delimiters to ""
  return newText
end replaceText
`;
}

export function parseAppleMailExport(rawJson) {
  const parsed = JSON.parse(rawJson || '[]');
  if (!Array.isArray(parsed)) {
    throw new Error('Apple Mail export must be a JSON array');
  }
  return parsed.map((message) => normalizeAppleMailMessage(message));
}

export function parseAppleMailTabExport(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const [messageId, sender, subject, content, dateReceived, attachmentsRaw = ''] = line.split('\t');
    const attachments = attachmentsRaw
      ? attachmentsRaw.split('||').filter(Boolean).map((part) => {
          const [name, mimeType] = part.split('::');
          return { name: name || 'attachment', mimeType: mimeType || null };
        })
      : [];

    return normalizeAppleMailMessage({
      messageId,
      sender,
      subject,
      content,
      dateReceived,
      attachments,
    });
  });
}

export function fetchAppleMailMessages(options = {}) {
  const script = buildAppleMailExportScript(options);
  const rawText = execFileSync('osascript', ['-e', script], { encoding: 'utf8' });
  return parseAppleMailTabExport(rawText);
}
