/**
 * Starfinder 2e Filter Schemas
 *
 * SF2e shares the same Foundry system engine as PF2e but has different
 * creature types and no alignment system.
 */

import { z } from 'zod';

/**
 * Starfinder 2e creature types (primary traits)
 */
export const SF2eCreatureTypes = [
  'aberration',
  'android',
  'animal',
  'beast',
  'construct',
  'dragon',
  'fey',
  'fungus',
  'humanoid',
  'monitor',
  'ooze',
  'plant',
  'swarm',
  'undead',
  'vermin'
] as const;

export type SF2eCreatureType = typeof SF2eCreatureTypes[number];

/**
 * Starfinder 2e rarity levels (same as PF2e)
 */
export const SF2eRarities = ['common', 'uncommon', 'rare', 'unique'] as const;
export type SF2eRarity = typeof SF2eRarities[number];

/**
 * Common creature sizes (same codes as PF2e)
 */
export const SF2eCreatureSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;
export type SF2eCreatureSize = typeof SF2eCreatureSizes[number];

/**
 * Starfinder 2e filter schema
 * No alignment field — SF2e removed the alignment system entirely.
 */
export const SF2eFiltersSchema = z.object({
  level: z.union([
    z.number().min(-1).max(30),
    z.object({
      min: z.number().min(-1).optional(),
      max: z.number().max(30).optional()
    })
  ]).optional(),
  creatureType: z.enum(SF2eCreatureTypes).optional(),
  traits: z.array(z.string()).optional(),
  rarity: z.enum(SF2eRarities).optional(),
  size: z.enum(SF2eCreatureSizes).optional(),
  hasSpells: z.boolean().optional()
});

export type SF2eFilters = z.infer<typeof SF2eFiltersSchema>;

/**
 * Check if a creature matches SF2e filters
 */
export function matchesSF2eFilters(creature: any, filters: SF2eFilters): boolean {
  // Level filter
  if (filters.level !== undefined) {
    const level = creature.systemData?.level;
    if (level === undefined) return false;

    if (typeof filters.level === 'number') {
      if (level !== filters.level) return false;
    } else {
      const min = filters.level.min ?? -1;
      const max = filters.level.max ?? 30;
      if (level < min || level > max) return false;
    }
  }

  // Creature type filter (checks traits array)
  if (filters.creatureType) {
    const traits = creature.systemData?.traits;
    if (!Array.isArray(traits)) return false;

    const hasType = traits.some((trait: string) =>
      trait.toLowerCase() === filters.creatureType!.toLowerCase()
    );
    if (!hasType) return false;
  }

  // Traits filter (creature must have all specified traits)
  if (filters.traits && filters.traits.length > 0) {
    const creatureTraits = creature.systemData?.traits;
    if (!Array.isArray(creatureTraits)) return false;

    const lowerTraits = creatureTraits.map((t: string) => t.toLowerCase());
    for (const requiredTrait of filters.traits) {
      if (!lowerTraits.includes(requiredTrait.toLowerCase())) {
        return false;
      }
    }
  }

  // Rarity filter
  if (filters.rarity) {
    const rarity = creature.systemData?.rarity;
    if (!rarity || rarity.toLowerCase() !== filters.rarity.toLowerCase()) {
      return false;
    }
  }

  // Size filter
  if (filters.size) {
    const size = creature.systemData?.size;
    if (!size || size.toLowerCase() !== filters.size.toLowerCase()) {
      return false;
    }
  }

  // Spellcaster filter
  if (filters.hasSpells !== undefined) {
    const hasSpells = creature.systemData?.hasSpellcasting || false;
    if (hasSpells !== filters.hasSpells) {
      return false;
    }
  }

  return true;
}

/**
 * Generate human-readable description of SF2e filters
 */
export function describeSF2eFilters(filters: SF2eFilters): string {
  const parts: string[] = [];

  if (filters.level !== undefined) {
    if (typeof filters.level === 'number') {
      parts.push(`Level ${filters.level}`);
    } else {
      const min = filters.level.min ?? -1;
      const max = filters.level.max ?? 30;
      parts.push(`Level ${min}-${max}`);
    }
  }

  if (filters.creatureType) parts.push(filters.creatureType);
  if (filters.rarity) parts.push(filters.rarity);
  if (filters.size) parts.push(filters.size);
  if (filters.traits && filters.traits.length > 0) {
    parts.push(`traits: ${filters.traits.join(', ')}`);
  }
  if (filters.hasSpells) parts.push('spellcaster');

  return parts.length > 0 ? parts.join(', ') : 'no filters';
}
