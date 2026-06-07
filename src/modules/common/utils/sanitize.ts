import sanitizeHtml from 'sanitize-html';

export function sanitize(value: string) {
  if (!value) return value;

  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
