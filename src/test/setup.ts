import '@testing-library/jest-dom';

// Polyfill Range getClientRects / getBoundingClientRect for TipTap / ProseMirror in jsdom
if (typeof window !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function () {
      return [] as unknown as DOMRectList;
    };
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = function () {
      return new DOMRect(0, 0, 0, 0);
    };
  }
}
