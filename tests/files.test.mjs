import test from 'node:test';
import assert from 'node:assert/strict';
import { mimeOf, kindOf, formatSize, cleanName, checkFiles } from '../src/domain/files.js';

const MB = 1024 * 1024;
const f = (name, type, size = 1000) => ({ name, type, size });
const code = (fn) => { try { fn(); return null; } catch (e) { return e.code; } };

test('نوع الملف يُستنتج من الامتداد عند غياب النوع', () => {
  assert.equal(mimeOf(f('a.docx', '')), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(mimeOf(f('clip.MOV', '')), 'video/quicktime');
  assert.equal(mimeOf(f('x.bin', '')), '');
  assert.equal(kindOf('image/png'), 'image'); assert.equal(kindOf('video/mp4'), 'video'); assert.equal(kindOf('application/pdf'), 'file');
});

test('الحدود: النوع والحجم والعدد لكل حاوية', () => {
  assert.equal(code(() => checkFiles('updates', [f('v.mp4', 'video/mp4', 40 * MB)])), null, 'فيديو 40MB مقبول في الموقع');
  assert.equal(code(() => checkFiles('visits', [f('v.mov', 'video/quicktime', 20 * MB), f('p.pdf', 'application/pdf'), f('i.jpg', 'image/jpeg')])), null);
  assert.equal(code(() => checkFiles('updates', [f('v.mp4', 'video/mp4', 60 * MB)])), 'file_big');
  assert.equal(code(() => checkFiles('receipts', [f('r.jpg', 'image/jpeg', 11 * MB)])), 'file_big', 'الحوالات حدها 10MB');
  assert.equal(code(() => checkFiles('receipts', [f('v.mp4', 'video/mp4')])), 'file_type', 'لا فيديو في الحوالات');
  assert.equal(code(() => checkFiles('contracts', [f('c.jpg', 'image/jpeg')])), 'file_type', 'العقود PDF فقط');
  for (const bad of [f('x.html', 'text/html'), f('x.svg', 'image/svg+xml'), f('x.exe', 'application/x-msdownload'), f('x.js', 'text/javascript'), f('x.bin', '')]) {
    assert.equal(code(() => checkFiles('updates', [bad])), 'file_type', bad.name);
  }
  const ten = Array.from({ length: 10 }, (_, i) => f(`${i}.jpg`, 'image/jpeg'));
  assert.equal(code(() => checkFiles('updates', ten)), null);
  assert.equal(code(() => checkFiles('updates', [...ten, f('11.jpg', 'image/jpeg')])), 'too_many');
  assert.equal(code(() => checkFiles('updates', [f('a.jpg', 'image/jpeg')], 10)), 'too_many', 'يحسب الملفات الموجودة');
});

test('تنسيق الحجم وتنظيف الاسم', () => {
  assert.equal(formatSize(2.5 * MB), '2.5 MB'); assert.equal(formatSize(2048), '2 KB'); assert.equal(formatSize(null), '');
  assert.equal(cleanName('a/b\\c<d>.pdf'), 'a_b_c_d_.pdf'); assert.equal(cleanName(''), 'file'); assert.equal(cleanName('x'.repeat(300)).length, 120);
});
