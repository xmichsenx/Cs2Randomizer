import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, GRENADES, MAX_GRENADES, availableTo } from '../js/loadout-data.js';
import { randomLoadout } from '../js/loadout-random.js';

const all = (budget, side) => ({
  side, budget, disabled: new Set(), categories: new Set(['smg', 'heavy', 'rifle', 'sniper']),
  primary: true, pistol: true, armor: true, grenades: true, equipment: true,
});

test('every CS2 firearm is in the pool', () => {
  assert.equal(WEAPONS.length, 34);
  assert.equal(new Set(WEAPONS.map((w) => w.id)).size, 34);
});

test('loadouts respect side, budget and grenade limits', () => {
  const seen = new Set();
  for (const side of ['T', 'CT']) {
    for (const budget of [Infinity, 800, 2000, 3500, 16000]) {
      for (let i = 0; i < 3000; i++) {
        const r = randomLoadout(all(budget, side));
        assert.ok(r.total <= budget, `over budget: ${r.total} > ${budget}`);
        for (const item of [r.primary, r.pistol, ...r.grenades, ...r.equipment].filter(Boolean)) {
          assert.ok(availableTo(item, side), `${item.name} not available to ${side}`);
          seen.add(item.id);
        }
        assert.ok(r.grenades.length <= MAX_GRENADES);
        for (const g of GRENADES) assert.ok(r.grenades.filter((x) => x.id === g.id).length <= g.max);
      }
    }
  }
  for (const w of WEAPONS) assert.ok(seen.has(w.id), `${w.name} never rolled`);
  for (const g of GRENADES) assert.ok(seen.has(g.id), `${g.name} never rolled`);
});
