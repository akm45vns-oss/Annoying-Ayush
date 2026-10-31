import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA & Mobile Installability Verification', () => {
  it('manifest.webmanifest exists, is valid JSON, and meets PWA installability requirements', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public/');

    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    assert.equal(manifest.name, 'Annoying Ayush - Your Pocket Companion');
    assert.ok(manifest.short_name);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.orientation, 'portrait');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.scope, '/');
    assert.ok(manifest.theme_color);
    assert.ok(manifest.background_color);

    // Verify icons
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);
    const has192 = manifest.icons.some((i) => i.sizes === '192x192');
    const has512 = manifest.icons.some((i) => i.sizes === '512x512');
    assert.ok(has192, 'manifest must include a 192x192 icon');
    assert.ok(has512, 'manifest must include a 512x512 icon');
  });

  it('manifest.json fallback exists and matches webmanifest specification', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json fallback must exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.display, 'standalone');
  });

  it('Service worker (public/sw.js) exists and implements core lifecycle events', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');

    const swSource = fs.readFileSync(swPath, 'utf8');
    assert.ok(swSource.includes("addEventListener('install'"), 'sw.js must handle install event');
    assert.ok(swSource.includes("addEventListener('activate'"), 'sw.js must handle activate event');
    assert.ok(swSource.includes("addEventListener('fetch'"), 'sw.js must handle fetch event');
    assert.ok(swSource.includes('/api/'), 'sw.js must bypass /api/ routes from cache');
  });

  it('index.html includes manifest link, apple-touch-icon, and mobile web app meta tags', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    assert.ok(indexHtml.includes('rel="manifest"'), 'index.html must include rel="manifest"');
    assert.ok(indexHtml.includes('rel="apple-touch-icon"'), 'index.html must include apple-touch-icon');
    assert.ok(indexHtml.includes('name="apple-mobile-web-app-capable"'), 'index.html must include iOS web app capable tag');
    assert.ok(indexHtml.includes('name="mobile-web-app-capable"'), 'index.html must include Android web app capable tag');
  });

  it('PWA icons exist and have valid PNG headers', () => {
    const iconFiles = [
      'public/pwa-192x192.png',
      'public/pwa-512x512.png',
      'public/pwa-maskable-512x512.png',
      'public/apple-touch-icon.png'
    ];

    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    for (const icon of iconFiles) {
      const fullPath = path.resolve(process.cwd(), icon);
      assert.ok(fs.existsSync(fullPath), `${icon} must exist`);
      const buffer = fs.readFileSync(fullPath);
      assert.ok(buffer.length > 500, `${icon} must not be empty`);
      assert.deepEqual(
        buffer.subarray(0, 8),
        pngHeader,
        `${icon} must have valid PNG magic bytes`
      );
    }
  });

  it('InstallModal component exists and is rendered in App.jsx', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/InstallModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'InstallModal.jsx component must exist');

    const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.jsx'), 'utf8');
    assert.ok(appSource.includes('<InstallModal'), 'App.jsx must render InstallModal');
  });
});

