import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, RELICS, validateChronicles } from '../dist/chronicles.mjs';

test('future nations can have relic previews before their chapter is released', () => {
  assert.equal(validateChronicles(), true);
  for (const relic of RELICS) {
    const chapter = CHAPTERS.find(item => item.id === relic.chapter);
    assert.equal(chapter.status, 'unrevealed');
    assert.equal(chapter.nation, null);
  }
});
test('catalogue refuses orphan relics, duplicate identities and unsupported loot activation', () => {
  assert.throws(() => validateChronicles(CHAPTERS, [{ ...RELICS[0], chapter:'missing' }]), /unknown chapter/);
  assert.throws(() => validateChronicles([...CHAPTERS, CHAPTERS[0]], RELICS), /Duplicate chapter/);
  assert.throws(() => validateChronicles(CHAPTERS, [{ ...RELICS[0], availability:'collectible' }]), /server integration/);
});
