import { readFileSync } from 'node:fs';

const sourcePath = 'src/locale/messages.en-US.xlf';
const localePaths = [
  ['pt-BR', 'src/locale/messages.pt-BR.xlf'],
  ['es-ES', 'src/locale/messages.es-ES.xlf'],
];

const sourceUnits = readUnits(readFileSync(sourcePath, 'utf8'));
let failed = false;

for (const [locale, path] of localePaths) {
  const units = readUnits(readFileSync(path, 'utf8'));
  const missing = [];
  const unfinished = [];
  const stale = [];

  for (const id of sourceUnits.keys()) {
    const unit = units.get(id);
    if (!unit) {
      missing.push(id);
      continue;
    }

    if (!unit.target.trim()) {
      missing.push(id);
    }

    if (/state="needs-translation"|state="new"/.test(unit.body)) {
      unfinished.push(id);
    }
  }

  for (const id of units.keys()) {
    if (!sourceUnits.has(id)) {
      stale.push(id);
    }
  }

  if (missing.length || unfinished.length || stale.length) {
    failed = true;
    console.error(`${locale} translation coverage failed.`);
    report('missing', missing);
    report('unfinished', unfinished);
    report('stale', stale);
  } else {
    console.log(`${locale}: ${units.size}/${sourceUnits.size} translations covered.`);
  }
}

if (failed) {
  process.exitCode = 1;
}

function readUnits(xml) {
  const units = new Map();
  const unitPattern = /<trans-unit id="([^"]+)" datatype="html">([\s\S]*?)<\/trans-unit>/g;
  for (const match of xml.matchAll(unitPattern)) {
    const [, id, body] = match;
    units.set(id, {
      body,
      target: body.match(/<target(?: [^>]*)?>([\s\S]*?)<\/target>/)?.[1] ?? '',
    });
  }

  return units;
}

function report(label, ids) {
  if (ids.length) {
    console.error(`  ${label}: ${ids.join(', ')}`);
  }
}
