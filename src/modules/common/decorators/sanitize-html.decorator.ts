import { Transform, TransformFnParams } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * TASK S5-CM-01: Custom Decorator để làm sạch HTML đầu vào
 * Sử dụng thư viện sanitize-html để loại bỏ script độc hại.
 */
export function SanitizeHtml(options?: sanitizeHtml.IOptions) {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return value;
    }

    // Cấu hình mặc định
    const defaultOptions: sanitizeHtml.IOptions = {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img',
        'h1',
        'h2',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['class', 'style'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    };

    const mergedOptions = options || defaultOptions;
    return sanitizeHtml(value, mergedOptions);
  });
}
