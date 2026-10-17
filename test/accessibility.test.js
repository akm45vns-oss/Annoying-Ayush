import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Accessibility & Viewport Configuration', () => {
  const indexHtmlPath = path.resolve('index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  it('restores accessible browser zoom in index.html (removes maximum-scale and user-scalable=no)', () => {
    assert.ok(
      !indexHtml.includes('user-scalable=no'),
      'index.html must not contain user-scalable=no'
    );
    assert.ok(
      !indexHtml.includes('maximum-scale'),
      'index.html must not contain maximum-scale'
    );
  });

  it('retains essential responsive viewport configuration', () => {
    assert.ok(
      indexHtml.includes('width=device-width'),
      'viewport must include width=device-width'
    );
    assert.ok(
      indexHtml.includes('initial-scale=1.0'),
      'viewport must include initial-scale=1.0'
    );
    assert.ok(
      indexHtml.includes('viewport-fit=cover'),
      'viewport must include viewport-fit=cover'
    );
  });

  it('provides accessible 16px minimum font size on inputs in CSS to prevent auto-zoom', () => {
    const cssPath = path.resolve('src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Check .transcription-input, .chat-text-input, and .romantic-text-input
    assert.ok(
      css.includes('.transcription-input') && css.includes('var(--text-base)'),
      '.transcription-input should use var(--text-base) (16px)'
    );
    assert.ok(
      css.includes('.chat-text-input') && css.includes('var(--text-base)'),
      '.chat-text-input should use var(--text-base) (16px)'
    );
    assert.ok(
      css.includes('.romantic-text-input') && css.includes('var(--text-base)'),
      '.romantic-text-input should use var(--text-base) (16px)'
    );
  });
});
