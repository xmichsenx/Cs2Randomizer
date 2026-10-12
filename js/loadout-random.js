import { WEAPONS, ARMOR, GRENADES, EQUIPMENT, MAX_GRENADES, availableTo } from './loadout-data.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const int = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Rolls a random buy.
 * @param {object} o
 * @param {'T'|'CT'} o.side
 * @param {number} o.budget            Infinity for no limit
 * @param {Set<string>} o.disabled     weapon ids excluded by the user
 * @param {Set<string>} o.categories   primary categories allowed (smg, heavy, rifle, sniper)
 * @param {boolean} o.primary
 * @param {boolean} o.pistol
 * @param {boolean} o.armor
 * @param {boolean} o.grenades
 * @param {boolean} o.equipment
 */
export function randomLoadout(o) {
  let money = o.budget;
  const affordable = (item) => item.price <= money;
  const spend = (price) => (money -= price);
  const result = { side: o.side, primary: null, pistol: null, armor: ARMOR[0], grenades: [], equipment: [] };

  const enabledWeapons = WEAPONS.filter((w) => availableTo(w, o.side) && !o.disabled.has(w.id));

  if (o.primary) {
    const pool = enabledWeapons.filter((w) => w.category !== 'pistol' && o.categories.has(w.category));
    const options = pool.filter(affordable);
    if (options.length) {
      result.primary = pick(options);
      spend(result.primary.price);
    }
  }

  if (o.armor) {
    result.armor = pick(ARMOR.filter(affordable));
    spend(result.armor.price);
  }

  // Every player spawns with the side's default pistol for free; buying another one replaces it.
  const pistols = enabledWeapons.filter((w) => w.category === 'pistol');
  const freePistols = pistols.filter((w) => w.default);
  if (o.pistol) {
    const options = pistols.filter((w) => w.default || affordable(w));
    if (options.length) {
      result.pistol = pick(options);
      if (!result.pistol.default) spend(result.pistol.price);
    }
  } else {
    result.pistol = freePistols[0] || WEAPONS.find((w) => w.default && availableTo(w, o.side));
  }
  if (!result.pistol) result.pistol = WEAPONS.find((w) => w.default && availableTo(w, o.side));
  result.pistolIsFree = !!result.pistol.default;

  if (o.grenades) {
    const wanted = int(0, MAX_GRENADES);
    const counts = {};
    for (let i = 0; i < wanted; i++) {
      const options = GRENADES.filter(
        (g) => availableTo(g, o.side) && (counts[g.id] || 0) < g.max && affordable(g),
      );
      if (!options.length) break;
      const g = pick(options);
      counts[g.id] = (counts[g.id] || 0) + 1;
      result.grenades.push(g);
      spend(g.price);
    }
    const order = GRENADES.map((g) => g.id);
    result.grenades.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  if (o.equipment) {
    for (const e of EQUIPMENT.filter((e) => availableTo(e, o.side))) {
      if (Math.random() < 0.4 && affordable(e)) {
        result.equipment.push(e);
        spend(e.price);
      }
    }
  }

  result.total =
    (result.primary?.price || 0) +
    (result.pistolIsFree ? 0 : result.pistol.price) +
    result.armor.price +
    result.grenades.reduce((acc, g) => acc + g.price, 0) +
    result.equipment.reduce((acc, e) => acc + e.price, 0);
  return result;
}
