import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateTankDesignPack } from '../../js/tank-design-schema.js';
import { getAllTanks, getTankCount, getTankCountByRarity, tankExists } from '../../js/tank-skins.js';
import { GENERATED_TANK_SKINS } from '../../js/tank-skins-generated.js';

const packPath = path.resolve(process.cwd(), 'assets/tank-designs/tank-design-pack.v1.json');

describe('Tank Forge generated content pack', () => {
  it('validates the generated Tank Forge design pack', () => {
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const validation = validateTankDesignPack(pack);

    expect(validation.valid, validation.errors.join('\n')).toBe(true);
    expect(validation.designs).toHaveLength(27);
  });

  it('expands the unlockable tank registry to 60 skins', () => {
    expect(GENERATED_TANK_SKINS).toHaveLength(27);
    expect(getTankCount()).toBe(60);
    expect(getTankCountByRarity()).toEqual({
      common: 13,
      uncommon: 14,
      rare: 13,
      epic: 11,
      legendary: 9
    });
  });

  it('points every generated registry entry at a baked PNG asset', () => {
    const allTankIds = new Set(getAllTanks().map((tank) => tank.id));

    GENERATED_TANK_SKINS.forEach((tank) => {
      expect(allTankIds.has(tank.id)).toBe(true);
      expect(tankExists(tank.id)).toBe(true);
      expect(tank.assetPath).toMatch(/^images\/tanks\/generated\/tank-/);
      expect(fs.existsSync(path.resolve(process.cwd(), 'assets', tank.assetPath))).toBe(true);
    });
  });
});
