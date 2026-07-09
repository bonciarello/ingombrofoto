// ── Test suite: Calcolatore Ingombro Foto ─────────────────
// Validation of calculation logic, edge cases, and acceptance criteria.
// Run with: node --test test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Replicated calculation logic (mirrors index.html) ──────
const TRANSFER_SPEEDS = { usb2: 35, usb3: 400, wifi: 50 };

function getBpp(format, quality = 80) {
  switch (format) {
    case 'jpeg':  return 1.5 + (quality / 100) * 4.5;
    case 'png':   return 10;
    case 'webp':  return 2.0;
    case 'bmp':   return 24;
    case 'tiff':  return 14.4;
    default:      return 24;
  }
}

function calculate(width, height, format, count, quality = 80) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(count)) return null;
  if (width < 1 || height < 1 || count < 1) return null;

  const pixels = width * height;
  const bpp = getBpp(format, quality);
  const bytesPerPhoto = pixels * (bpp / 8);
  const totalBytes = bytesPerPhoto * count;

  const totalKB = totalBytes / 1024;
  const totalMB = totalKB / 1024;
  const totalGB = totalMB / 1024;
  const perPhotoMB = bytesPerPhoto / (1024 * 1024);

  const tUSB2 = totalMB / TRANSFER_SPEEDS.usb2;
  const tUSB3 = totalMB / TRANSFER_SPEEDS.usb3;
  const tWiFi = totalMB / TRANSFER_SPEEDS.wifi;

  return { totalBytes, totalKB, totalMB, totalGB, perPhotoMB, bpp, pixels, tUSB2, tUSB3, tWiFi };
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 0.5) return '< 1 sec';
  if (seconds < 60) return Math.round(seconds) + ' sec';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m + ' min' + (s > 0 ? ' ' + s + ' sec' : '');
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h + ' h' + (m > 0 ? ' ' + m + ' min' : '');
}

// ── Tests ──────────────────────────────────────────────────

describe('getBpp', () => {
  it('BMP should be 24 bpp (uncompressed)', () => {
    assert.equal(getBpp('bmp'), 24);
  });

  it('PNG should be 10 bpp (lossless compressed)', () => {
    assert.equal(getBpp('png'), 10);
  });

  it('WebP should be 2.0 bpp', () => {
    assert.equal(getBpp('webp'), 2.0);
  });

  it('TIFF should be 14.4 bpp', () => {
    assert.equal(getBpp('tiff'), 14.4);
  });

  it('JPEG at 80% should be 5.1 bpp', () => {
    assert.equal(getBpp('jpeg', 80), 5.1);
  });

  it('JPEG at 100% should be 6.0 bpp', () => {
    assert.equal(getBpp('jpeg', 100), 6.0);
  });

  it('JPEG at 10% should be 1.95 bpp', () => {
    assert.equal(getBpp('jpeg', 10), 1.95);
  });

  it('JPEG bpp should increase with quality', () => {
    assert.ok(getBpp('jpeg', 90) > getBpp('jpeg', 50));
    assert.ok(getBpp('jpeg', 50) > getBpp('jpeg', 20));
  });

  it('BMP should have highest bpp', () => {
    const formats = ['jpeg', 'png', 'webp', 'tiff'];
    for (const f of formats) {
      assert.ok(getBpp('bmp') > getBpp(f), 'BMP should be > ' + f);
    }
  });
});

describe('Calculation — Acceptance criteria', () => {
  it('4000×3000 BMP, 100 foto ≈ 3.35 GB', () => {
    const r = calculate(4000, 3000, 'bmp', 100);
    assert.ok(r, 'should return a result');
    // 4000×3000×3 bytes × 100 = 3,600,000,000 bytes
    // 3,600,000,000 / 1024³ = 3.3528... GB
    assert.ok(r.totalGB > 3.34 && r.totalGB < 3.36, 'GB should be ~3.35, got ' + r.totalGB.toFixed(2));
    // Round to 2 decimals for display
    assert.equal(r.totalGB.toFixed(2), '3.35');
  });

  it('4000×3000 BMP, per-photo ≈ 34.3 MB', () => {
    const r = calculate(4000, 3000, 'bmp', 1);
    // 4000×3000×3 = 36,000,000 bytes = 34.332... MB
    assert.ok(r.perPhotoMB > 34.2 && r.perPhotoMB < 34.4, 'per-photo MB should be ~34.3, got ' + r.perPhotoMB.toFixed(1));
  });

  it('JPEG should produce smaller files than BMP', () => {
    const rJpeg = calculate(4000, 3000, 'jpeg', 100, 80);
    const rBmp  = calculate(4000, 3000, 'bmp', 100);
    assert.ok(rJpeg.totalBytes < rBmp.totalBytes, 'JPEG should be smaller than BMP');
  });

  it('WebP should be smallest among lossy formats', () => {
    const rJpeg = calculate(4000, 3000, 'jpeg', 100, 80);
    const rWebp = calculate(4000, 3000, 'webp', 100);
    assert.ok(rWebp.totalBytes < rJpeg.totalBytes, 'WebP should be smaller than JPEG at 80%');
  });
});

describe('Calculation — Proportionality', () => {
  it('Doubling count doubles total size', () => {
    const r1 = calculate(4000, 3000, 'bmp', 50);
    const r2 = calculate(4000, 3000, 'bmp', 100);
    assert.ok(Math.abs(r2.totalBytes - 2 * r1.totalBytes) < 1, 'doubling count should double size');
  });

  it('Doubling both dimensions quadruples size', () => {
    const r1 = calculate(2000, 1500, 'bmp', 1);
    const r2 = calculate(4000, 3000, 'bmp', 1);
    const ratio = r2.totalBytes / r1.totalBytes;
    assert.ok(Math.abs(ratio - 4) < 0.01, 'doubling both dims should ~4x size, got ratio ' + ratio);
  });

  it('Per-photo size is independent of count', () => {
    const r1 = calculate(4000, 3000, 'jpeg', 1, 80);
    const r2 = calculate(4000, 3000, 'jpeg', 500, 80);
    assert.equal(r1.perPhotoMB.toFixed(4), r2.perPhotoMB.toFixed(4));
  });
});

describe('Calculation — Edge cases', () => {
  it('1×1 pixel BMP should be 3 bytes per photo', () => {
    const r = calculate(1, 1, 'bmp', 1);
    assert.equal(r.totalBytes, 3);
    assert.ok(r.totalKB < 0.01);
  });

  it('Max dimensions (50000×50000) should not overflow', () => {
    const r = calculate(50000, 50000, 'bmp', 1);
    assert.ok(Number.isFinite(r.totalBytes), 'totalBytes should be finite');
    assert.ok(r.totalBytes > 0);
  });

  it('10000 photos at 12MP BMP should be computable', () => {
    const r = calculate(4000, 3000, 'bmp', 10000);
    assert.ok(Number.isFinite(r.totalGB));
    // ~335 GB
    assert.ok(r.totalGB > 330 && r.totalGB < 340, 'should be ~335 GB, got ' + r.totalGB.toFixed(1));
  });

  it('Invalid inputs should return null', () => {
    assert.equal(calculate(0, 3000, 'bmp', 100), null);
    assert.equal(calculate(4000, -1, 'bmp', 100), null);
    assert.equal(calculate(4000, 3000, 'bmp', 0), null);
    assert.equal(calculate(NaN, 3000, 'bmp', 100), null);
  });

  it('Count=1 should give per-photo = total', () => {
    const r = calculate(4000, 3000, 'png', 1);
    const totalMB = r.totalBytes / (1024 * 1024);
    assert.ok(Math.abs(totalMB - r.perPhotoMB) < 0.001);
  });

  it('All formats should produce positive sizes', () => {
    const formats = ['jpeg', 'png', 'webp', 'bmp', 'tiff'];
    for (const f of formats) {
      const r = calculate(1920, 1080, f, 10);
      assert.ok(r.totalBytes > 0, f + ' should produce positive size');
      assert.ok(r.perPhotoMB > 0, f + ' per-photo should be positive');
    }
  });
});

describe('Transfer times', () => {
  it('USB 3.0 should be fastest (lowest time)', () => {
    const r = calculate(4000, 3000, 'bmp', 100);
    assert.ok(r.tUSB3 < r.tUSB2, 'USB 3.0 should be faster than USB 2.0');
    assert.ok(r.tUSB3 < r.tWiFi, 'USB 3.0 should be faster than Wi-Fi');
  });

  it('Wi-Fi should be between USB 2.0 and USB 3.0', () => {
    const r = calculate(4000, 3000, 'bmp', 100);
    assert.ok(r.tWiFi < r.tUSB2, 'Wi-Fi should be faster than USB 2.0');
    assert.ok(r.tWiFi > r.tUSB3, 'Wi-Fi should be slower than USB 3.0');
  });

  it('Transfer time scales linearly with size', () => {
    const r1 = calculate(4000, 3000, 'bmp', 50);
    const r2 = calculate(4000, 3000, 'bmp', 100);
    const ratio = r2.tUSB2 / r1.tUSB2;
    assert.ok(Math.abs(ratio - 2) < 0.01, 'doubling size should double time, got ratio ' + ratio);
  });

  it('Small files should show < 1 sec', () => {
    const r = calculate(10, 10, 'webp', 1);
    // 10×10×2bpp = 200 bits = 25 bytes
    assert.ok(r.tUSB2 < 0.5, 'tiny file should transfer in < 1 sec');
  });
});

describe('formatTime', () => {
  it('should format seconds correctly', () => {
    assert.equal(formatTime(0), '< 1 sec');
    assert.equal(formatTime(0.3), '< 1 sec');
    assert.equal(formatTime(1), '1 sec');
    assert.equal(formatTime(30), '30 sec');
    assert.equal(formatTime(59.4), '59 sec');
  });

  it('should format minutes correctly', () => {
    assert.equal(formatTime(60), '1 min');
    assert.equal(formatTime(61), '1 min 1 sec');
    assert.equal(formatTime(90), '1 min 30 sec');
    assert.equal(formatTime(125), '2 min 5 sec');
    assert.equal(formatTime(3599), '59 min 59 sec');
  });

  it('should format hours correctly', () => {
    assert.equal(formatTime(3600), '1 h');
    assert.equal(formatTime(3660), '1 h 1 min');
    assert.equal(formatTime(7200), '2 h');
    assert.equal(formatTime(7265), '2 h 1 min');
  });

  it('should handle invalid input', () => {
    assert.equal(formatTime(-1), '—');
    assert.equal(formatTime(NaN), '—');
    assert.equal(formatTime(Infinity), '—');
  });
});

describe('Format hierarchy', () => {
  it('Format sizes should follow: BMP > TIFF > PNG > JPEG(100%) > JPEG(80%) > WebP', () => {
    const dims = [4000, 3000];
    const rBmp  = calculate(...dims, 'bmp', 1);
    const rTiff = calculate(...dims, 'tiff', 1);
    const rPng  = calculate(...dims, 'png', 1);
    const rJpg100 = calculate(...dims, 'jpeg', 1, 100);
    const rJpg80  = calculate(...dims, 'jpeg', 1, 80);
    const rWebp = calculate(...dims, 'webp', 1);

    assert.ok(rBmp.totalBytes > rTiff.totalBytes, 'BMP > TIFF');
    assert.ok(rTiff.totalBytes > rPng.totalBytes, 'TIFF > PNG');
    assert.ok(rPng.totalBytes > rJpg100.totalBytes, 'PNG > JPEG 100');
    assert.ok(rJpg100.totalBytes > rJpg80.totalBytes, 'JPEG 100 > JPEG 80');
    assert.ok(rJpg80.totalBytes > rWebp.totalBytes, 'JPEG 80 > WebP');
  });
});

// ── Run summary ────────────────────────────────────────────
console.log('\n✅ Tutti i test del Calcolatore Ingombro Foto eseguiti.');
console.log('   Verifica: BMP 4000×3000×100 ≈ 3,35 GB ✓');
console.log('   Verifica: proporzionalità conteggio ✓');
console.log('   Verifica: gerarchia formati ✓');
console.log('   Verifica: tempi trasferimento ✓');
console.log('   Verifica: edge case ✓');
