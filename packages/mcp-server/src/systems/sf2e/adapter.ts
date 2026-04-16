/**
 * Starfinder 2e System Adapter
 *
 * Implements SystemAdapter interface for Starfinder 2nd Edition support.
 * SF2e shares the PF2e Foundry system engine — data paths are identical —
 * but has different creature types and no alignment system.
 *
 * Foundry system ID: 'starfinder2e'
 */

import type { SystemAdapter, SystemMetadata, SystemCreatureIndex, SF2eCreatureIndex } from '../types.js';
import { SF2eFiltersSchema, matchesSF2eFilters, describeSF2eFilters, type SF2eFilters } from './filters.js';

/**
 * SF2e creature types for primary type detection
 */
const SF2E_CREATURE_TRAITS = [
  'aberration', 'android', 'animal', 'beast', 'construct', 'dragon',
  'fey', 'fungus', 'humanoid', 'monitor', 'ooze', 'plant',
  'swarm', 'undead', 'vermin'
];

export class SF2eAdapter implements SystemAdapter {
  getMetadata(): SystemMetadata {
    return {
      id: 'sf2e',
      name: 'sf2e',
      displayName: 'Starfinder 2nd Edition',
      version: '1.0.0',
      description: 'Support for Starfinder 2e with Level, traits, rarity, Stamina/Resolve Points, and spellcasting',
      supportedFeatures: {
        creatureIndex: true,
        characterStats: true,
        spellcasting: true,
        powerLevel: true
      }
    };
  }

  canHandle(systemId: string): boolean {
    // Foundry VTT system package ID for Starfinder 2nd Edition
    return systemId.toLowerCase() === 'starfinder2e';
  }

  extractCreatureData(_doc: any, _pack: any): { creature: SystemCreatureIndex; errors: number } | null {
    // Delegated to SF2eIndexBuilder (runs in Foundry browser context)
    throw new Error('extractCreatureData should be called from SF2eIndexBuilder, not the adapter');
  }

  getFilterSchema() {
    return SF2eFiltersSchema;
  }

  matchesFilters(creature: SystemCreatureIndex, filters: Record<string, any>): boolean {
    const validated = SF2eFiltersSchema.safeParse(filters);
    if (!validated.success) return false;
    return matchesSF2eFilters(creature, validated.data as SF2eFilters);
  }

  getDataPaths(): Record<string, string | null> {
    return {
      // Identical to PF2e paths
      level: 'system.details.level.value',
      creatureType: 'system.traits.value',
      size: 'system.traits.size.value',
      rarity: 'system.traits.rarity',
      traits: 'system.traits.value',
      hitPoints: 'system.attributes.hp',
      armorClass: 'system.attributes.ac.value',
      abilities: 'system.abilities',
      skills: 'system.skills',
      perception: 'system.perception',
      saves: 'system.saves',
      // SF2e specific
      staminaPoints: 'system.attributes.sp',
      resolvePoints: 'system.attributes.rp',
      // Not applicable
      challengeRating: null,
      alignment: null,          // SF2e has no alignment
      legendaryActions: null,
      legendaryResistances: null,
      spells: null
    };
  }

  formatCreatureForList(creature: SystemCreatureIndex): any {
    const sf2eCreature = creature as SF2eCreatureIndex;
    const formatted: any = {
      id: creature.id,
      name: creature.name,
      type: creature.type,
      pack: {
        id: creature.packName,
        label: creature.packLabel
      }
    };

    if (sf2eCreature.systemData) {
      const stats: any = {};

      if (sf2eCreature.systemData.level !== undefined) {
        stats.level = sf2eCreature.systemData.level;
      }

      if (sf2eCreature.systemData.traits && sf2eCreature.systemData.traits.length > 0) {
        stats.traits = sf2eCreature.systemData.traits;

        const primaryType = sf2eCreature.systemData.traits.find((t: string) =>
          SF2E_CREATURE_TRAITS.includes(t.toLowerCase())
        );
        if (primaryType) stats.creatureType = primaryType;
      }

      if (sf2eCreature.systemData.rarity) stats.rarity = sf2eCreature.systemData.rarity;
      if (sf2eCreature.systemData.size) stats.size = sf2eCreature.systemData.size;
      if (sf2eCreature.systemData.hitPoints) stats.hitPoints = sf2eCreature.systemData.hitPoints;
      if (sf2eCreature.systemData.armorClass) stats.armorClass = sf2eCreature.systemData.armorClass;
      if (sf2eCreature.systemData.hasSpellcasting) stats.spellcaster = true;

      if (Object.keys(stats).length > 0) {
        formatted.stats = stats;
      }
    }

    if (creature.img) formatted.hasImage = true;

    return formatted;
  }

  formatCreatureForDetails(creature: SystemCreatureIndex): any {
    const sf2eCreature = creature as SF2eCreatureIndex;
    const formatted = this.formatCreatureForList(creature);

    if (sf2eCreature.systemData) {
      formatted.detailedStats = {
        level: sf2eCreature.systemData.level,
        traits: sf2eCreature.systemData.traits,
        size: sf2eCreature.systemData.size,
        rarity: sf2eCreature.systemData.rarity,
        hitPoints: sf2eCreature.systemData.hitPoints,
        armorClass: sf2eCreature.systemData.armorClass,
        staminaPoints: sf2eCreature.systemData.staminaPoints,
        resolvePoints: sf2eCreature.systemData.resolvePoints,
        hasSpellcasting: sf2eCreature.systemData.hasSpellcasting
      };
    }

    if (creature.img) formatted.img = creature.img;

    return formatted;
  }

  describeFilters(filters: Record<string, any>): string {
    const validated = SF2eFiltersSchema.safeParse(filters);
    if (!validated.success) return 'invalid filters';
    return describeSF2eFilters(validated.data as SF2eFilters);
  }

  getPowerLevel(creature: SystemCreatureIndex): number | undefined {
    const sf2eCreature = creature as SF2eCreatureIndex;
    return sf2eCreature.systemData?.level;
  }

  extractCharacterStats(actorData: any): any {
    const system = actorData.system || {};
    const stats: any = {};

    stats.name = actorData.name;
    stats.type = actorData.type;

    // Level (same path as PF2e)
    const level = system.details?.level?.value ?? system.details?.level ?? system.level;
    if (level !== undefined && level !== null) {
      stats.level = Number(level);
    }

    // Hit Points
    const hp = system.attributes?.hp;
    if (hp) {
      stats.hitPoints = {
        current: hp.value ?? 0,
        max: hp.max ?? 0,
        temp: hp.temp ?? 0
      };
    }

    // Stamina Points (SF2e specific)
    const sp = system.attributes?.sp;
    if (sp) {
      stats.staminaPoints = {
        current: sp.value ?? 0,
        max: sp.max ?? 0
      };
    }

    // Resolve Points (SF2e specific)
    const rp = system.attributes?.rp;
    if (rp) {
      stats.resolvePoints = {
        current: rp.value ?? 0,
        max: rp.max ?? 0
      };
    }

    // Armor Class (same path as PF2e)
    const ac = system.attributes?.ac?.value ?? system.attributes?.ac;
    if (ac !== undefined) {
      stats.armorClass = ac;
    }

    // Abilities
    if (system.abilities) {
      stats.abilities = {};
      for (const [key, ability] of Object.entries(system.abilities)) {
        const abilityData = ability as any;
        stats.abilities[key] = {
          value: abilityData.value ?? abilityData.mod ?? 0,
          modifier: abilityData.mod ?? 0
        };
      }
    }

    // Skills
    if (system.skills) {
      stats.skills = {};
      for (const [key, skill] of Object.entries(system.skills)) {
        const skillData = skill as any;
        stats.skills[key] = {
          modifier: skillData.value ?? skillData.mod ?? 0,
          rank: skillData.rank ?? 0,
          proficient: (skillData.rank ?? 0) > 0
        };
      }
    }

    // Perception
    if (system.perception) {
      stats.perception = {
        modifier: system.perception.value ?? system.perception.mod ?? 0,
        rank: system.perception.rank ?? 0
      };
    }

    // Saves
    if (system.saves) {
      stats.saves = {};
      for (const [key, save] of Object.entries(system.saves)) {
        const saveData = save as any;
        stats.saves[key] = {
          modifier: saveData.value ?? saveData.mod ?? 0,
          rank: saveData.rank ?? 0
        };
      }
    }

    // NPC/creature-specific
    if (actorData.type === 'npc' || actorData.type === 'creature') {
      const traits = system.traits?.value || [];
      if (Array.isArray(traits) && traits.length > 0) {
        stats.traits = traits;

        const primaryType = traits.find((t: string) =>
          SF2E_CREATURE_TRAITS.includes(t.toLowerCase())
        );
        if (primaryType) stats.creatureType = primaryType;
      }

      const size = system.traits?.size?.value ?? system.traits?.size;
      if (size) stats.size = size;

      const rarity = system.traits?.rarity;
      if (rarity) stats.rarity = rarity;
    }

    // Spellcasting
    const spellcasting = system.spellcasting || {};
    if (Object.keys(spellcasting).length > 0) {
      stats.spellcasting = {
        hasSpells: true,
        entries: Object.keys(spellcasting).length
      };
    }

    return stats;
  }
}
