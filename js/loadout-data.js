// Every buyable item in CS2 competitive (as of October 2026), with buy-menu prices.
// side: 'T' | 'CT' | 'both'

export const CATEGORIES = {
  pistol: 'Pistols',
  smg: 'SMGs',
  heavy: 'Shotguns & MGs',
  rifle: 'Rifles',
  sniper: 'Snipers',
};

export const WEAPONS = [
  // Pistols
  { id: 'glock', name: 'Glock-18', category: 'pistol', side: 'T', price: 200, default: true },
  { id: 'usp', name: 'USP-S', category: 'pistol', side: 'CT', price: 200, default: true },
  { id: 'p2000', name: 'P2000', category: 'pistol', side: 'CT', price: 200, default: true },
  { id: 'elite', name: 'Dual Berettas', category: 'pistol', side: 'both', price: 300 },
  { id: 'p250', name: 'P250', category: 'pistol', side: 'both', price: 300 },
  { id: 'tec9', name: 'Tec-9', category: 'pistol', side: 'T', price: 500 },
  { id: 'fiveseven', name: 'Five-SeveN', category: 'pistol', side: 'CT', price: 500 },
  { id: 'cz75', name: 'CZ75-Auto', category: 'pistol', side: 'both', price: 500 },
  { id: 'deagle', name: 'Desert Eagle', category: 'pistol', side: 'both', price: 700 },
  { id: 'revolver', name: 'R8 Revolver', category: 'pistol', side: 'both', price: 600 },
  // SMGs
  { id: 'mac10', name: 'MAC-10', category: 'smg', side: 'T', price: 1050 },
  { id: 'mp9', name: 'MP9', category: 'smg', side: 'CT', price: 1250 },
  { id: 'mp7', name: 'MP7', category: 'smg', side: 'both', price: 1500 },
  { id: 'mp5sd', name: 'MP5-SD', category: 'smg', side: 'both', price: 1500 },
  { id: 'ump45', name: 'UMP-45', category: 'smg', side: 'both', price: 1200 },
  { id: 'p90', name: 'P90', category: 'smg', side: 'both', price: 2350 },
  { id: 'bizon', name: 'PP-Bizon', category: 'smg', side: 'both', price: 1400 },
  // Heavy
  { id: 'nova', name: 'Nova', category: 'heavy', side: 'both', price: 1050 },
  { id: 'xm1014', name: 'XM1014', category: 'heavy', side: 'both', price: 2000 },
  { id: 'sawedoff', name: 'Sawed-Off', category: 'heavy', side: 'T', price: 1100 },
  { id: 'mag7', name: 'MAG-7', category: 'heavy', side: 'CT', price: 1300 },
  { id: 'm249', name: 'M249', category: 'heavy', side: 'both', price: 5200 },
  { id: 'negev', name: 'Negev', category: 'heavy', side: 'both', price: 1700 },
  // Rifles
  { id: 'galil', name: 'Galil AR', category: 'rifle', side: 'T', price: 1800 },
  { id: 'famas', name: 'FAMAS', category: 'rifle', side: 'CT', price: 1950 },
  { id: 'ak47', name: 'AK-47', category: 'rifle', side: 'T', price: 2700 },
  { id: 'm4a4', name: 'M4A4', category: 'rifle', side: 'CT', price: 3100 },
  { id: 'm4a1s', name: 'M4A1-S', category: 'rifle', side: 'CT', price: 2900 },
  { id: 'sg553', name: 'SG 553', category: 'rifle', side: 'T', price: 3000 },
  { id: 'aug', name: 'AUG', category: 'rifle', side: 'CT', price: 3300 },
  // Snipers
  { id: 'ssg08', name: 'SSG 08', category: 'sniper', side: 'both', price: 1700 },
  { id: 'awp', name: 'AWP', category: 'sniper', side: 'both', price: 4750 },
  { id: 'g3sg1', name: 'G3SG1', category: 'sniper', side: 'T', price: 5000 },
  { id: 'scar20', name: 'SCAR-20', category: 'sniper', side: 'CT', price: 5000 },
];

export const ARMOR = [
  { id: 'none', name: 'No Armor', price: 0 },
  { id: 'kevlar', name: 'Kevlar Vest', price: 650 },
  { id: 'kevlar_helmet', name: 'Kevlar + Helmet', price: 1000 },
];

// A player can carry 4 grenades at most, with up to 2 flashbangs and 1 of every other type.
export const MAX_GRENADES = 4;
export const GRENADES = [
  { id: 'flashbang', name: 'Flashbang', side: 'both', price: 200, max: 2 },
  { id: 'hegrenade', name: 'HE Grenade', side: 'both', price: 300, max: 1 },
  { id: 'smokegrenade', name: 'Smoke Grenade', side: 'both', price: 300, max: 1 },
  { id: 'decoy', name: 'Decoy Grenade', side: 'both', price: 50, max: 1 },
  { id: 'molotov', name: 'Molotov', side: 'T', price: 400, max: 1, fireGroup: true },
  { id: 'incgrenade', name: 'Incendiary Grenade', side: 'CT', price: 500, max: 1, fireGroup: true },
];

export const EQUIPMENT = [
  { id: 'taser', name: 'Zeus x27', side: 'both', price: 200 },
  { id: 'defuser', name: 'Defuse Kit', side: 'CT', price: 400 },
];

export const availableTo = (item, side) => item.side === 'both' || item.side === side;
