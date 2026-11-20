import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const dir = dirname(fileURLToPath(import.meta.url));
const app = readFileSync(join(dir, 'App.tsx'), 'utf8');
const views = readFileSync(join(dir, 'InvViews.tsx'), 'utf8');
const css = readFileSync(join(dir, 'ss.css'), 'utf8');

test('grid and saved unit cards render a visible match score', () => {
  assert.match(app, /function Tile\(/);
  assert.match(app, /data-spec-id=\{`info-score#\$\{u\.stock\}/);
  assert.match(app, /\{m\.score\}/);
  assert.match(views, /function CarTile\(/);
  assert.match(views, /data-spec-id=\{`info-score#\$\{u\.stock\}/);
  assert.match(views, /\{m\.score\}/);
  assert.match(views, /className="score score-on-photo"/);
  assert.match(css, /\.ph-media \.score-on-photo/);
  assert.doesNotMatch(css, /\.ph-media \.score-on-photo[^}]*var\(--gold\)/);
});

test('all inventory is one ranked list with no pinned tray or empty slots', () => {
  assert.doesNotMatch(app, /function TopStrip\(/);
  assert.doesNotMatch(app, /function PinSlot\(/);
  assert.doesNotMatch(app, /<TopStrip\b/);
  assert.doesNotMatch(app, /setPins\(\[rows\[0\]/);
  assert.match(app, /const pageRows = rows\.slice\(0, PAGE\)/);
  assert.match(app, /<Carousel others=\{pageRows\}/);
  assert.match(app, /<InvTable others=\{rows\}/);
  assert.doesNotMatch(views, /All other inventory/);
  assert.match(views, />All inventory</);
  assert.doesNotMatch(views, /Top three slot \d+ is open/);
  assert.doesNotMatch(views, /Open slot/);
  assert.doesNotMatch(views, /Pin an RV here/);
  assert.doesNotMatch(views, /className="t3bar"/);
});

test('list rows still show the existing score cell', () => {
  assert.match(views, /function TRow\(/);
  assert.match(views, /className="score"/);
  assert.match(views, /\{m\.score\}/);
});
