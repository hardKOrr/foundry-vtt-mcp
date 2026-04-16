/**
 * Starfinder 2e Index Builder
 *
 * Builds enhanced creature index from Foundry compendiums.
 * This code runs in Foundry's browser context, not Node.js.
 *
 * SF2e shares the same data-path structure as PF2e but has different
 * creature types and no alignment system.
 */

import type { IndexBuilder, SF2eCreatureIndex } from '../types.js';

// Foundry browser globals (unavailable in Node.js TypeScript compilation)
declare const ui: any;

/**
 * SF2e creature types used for primary type extraction from traits
 */
const SF2E_CREATURE_TRAITS = [
  'aberration', 'android', 'animal', 'beast', 'construct', 'dragon',
  'fey', 'fungus', 'humanoid', 'monitor', 'ooze', 'plant',
  'swarm', 'undead', 'vermin'
];

/**
 * SF2e implementation of IndexBuilder
 */
export class SF2eIndexBuilder implements IndexBuilder {
  private moduleId: string;

  constructor(moduleId: string = 'foundry-mcp-bridge') {
    this.moduleId = moduleId;
  }

  getSystemId() {
    return 'sf2e' as const;
  }

  /**
   * Build enhanced creature index from compendium packs
   */
  async buildIndex(packs: any[], _force = false): Promise<SF2eCreatureIndex[]> {
    const startTime = Date.now();
    let progressNotification: any = null;
    let totalErrors = 0;

    try {
      const actorPacks = packs.filter(pack => pack.metadata.type === 'Actor');
      const enhancedCreatures: SF2eCreatureIndex[] = [];

      console.log(`[${this.moduleId}] Starting SF2e creature index build from ${actorPacks.length} packs...`);
      if (typeof ui !== 'undefined' && ui.notifications) {
        ui.notifications.info(`Starting SF2e creature index build from ${actorPacks.length} packs...`);
      }

      let currentPack = 0;
      for (const pack of actorPacks) {
        currentPack++;

        if (progressNotification && typeof ui !== 'undefined') {
          progressNotification.remove();
        }
        if (typeof ui !== 'undefined' && ui.notifications) {
          progressNotification = ui.notifications.info(
            `Building SF2e index: Pack ${currentPack}/${actorPacks.length} (${pack.metadata.label})...`
          );
        }

        const result = await this.extractDataFromPack(pack);
        enhancedCreatures.push(...result.creatures);
        totalErrors += result.errors;
      }

      if (progressNotification && typeof ui !== 'undefined') {
        progressNotification.remove();
      }
      if (typeof ui !== 'undefined' && ui.notifications) {
        ui.notifications.info(`Saving SF2e index to world database... (${enhancedCreatures.length} creatures)`);
      }

      const buildTimeSeconds = Math.round((Date.now() - startTime) / 1000);
      const errorText = totalErrors > 0 ? ` (${totalErrors} extraction errors)` : '';
      const successMessage = `SF2e creature index complete! ${enhancedCreatures.length} creatures indexed from ${actorPacks.length} packs in ${buildTimeSeconds}s${errorText}`;

      console.log(`[${this.moduleId}] ${successMessage}`);
      if (typeof ui !== 'undefined' && ui.notifications) {
        ui.notifications.info(successMessage);
      }

      return enhancedCreatures;

    } catch (error) {
      if (progressNotification && typeof ui !== 'undefined') {
        progressNotification.remove();
      }

      const errorMessage = `Failed to build SF2e creature index: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[${this.moduleId}] ${errorMessage}`);
      if (typeof ui !== 'undefined' && ui.notifications) {
        ui.notifications.error(errorMessage);
      }

      throw error;
    }
  }

  /**
   * Extract creature data from a single compendium pack
   */
  async extractDataFromPack(pack: any): Promise<{ creatures: SF2eCreatureIndex[]; errors: number }> {
    const creatures: SF2eCreatureIndex[] = [];
    let errors = 0;

    try {
      const documents = await pack.getDocuments();

      for (const doc of documents) {
        try {
          if (doc.type !== 'npc' && doc.type !== 'character' && doc.type !== 'creature') {
            continue;
          }

          const result = this.extractCreatureData(doc, pack);
          if (result) {
            creatures.push(result.creature);
            errors += result.errors;
          }

        } catch (error) {
          console.warn(`[${this.moduleId}] Failed to extract SF2e data from ${doc.name} in ${pack.metadata.label}:`, error);
          errors++;
        }
      }

    } catch (error) {
      console.warn(`[${this.moduleId}] Failed to load documents from ${pack.metadata.label}:`, error);
      errors++;
    }

    return { creatures, errors };
  }

  /**
   * Extract Starfinder 2e creature data from a single document
   */
  extractCreatureData(doc: any, pack: any): { creature: SF2eCreatureIndex; errors: number } | null {
    try {
      const system = doc.system || {};

      // Level (same path as PF2e)
      let level = system.details?.level?.value ?? 0;
      level = Number(level) || 0;

      // Traits (same path as PF2e)
      const traitsValue = system.traits?.value || [];
      const traits = Array.isArray(traitsValue) ? traitsValue : [];

      // Primary creature type from traits
      const creatureType = traits.find((t: string) =>
        SF2E_CREATURE_TRAITS.includes(t.toLowerCase())
      )?.toLowerCase() || 'unknown';

      // Rarity (same path as PF2e)
      const rarity = system.traits?.rarity || 'common';

      // Size (same codes as PF2e)
      let size = system.traits?.size?.value || 'med';
      const sizeMap: Record<string, string> = {
        'tiny': 'tiny', 'sm': 'small', 'med': 'medium',
        'lg': 'large', 'huge': 'huge', 'grg': 'gargantuan'
      };
      size = sizeMap[size.toLowerCase()] || 'medium';

      // HP / AC (same paths as PF2e)
      const hitPoints = system.attributes?.hp?.max || 0;
      const armorClass = system.attributes?.ac?.value || 10;

      // Stamina Points (SF2e specific)
      const staminaPoints = system.attributes?.sp?.max;

      // Resolve Points (SF2e specific)
      const resolvePoints = system.attributes?.rp?.max;

      // Spellcasting (same pattern as PF2e)
      const spellcasting = system.spellcasting || {};
      const hasSpellcasting = Object.keys(spellcasting).length > 0;

      return {
        creature: {
          id: doc._id,
          name: doc.name,
          type: doc.type,
          packName: pack.metadata.id,
          packLabel: pack.metadata.label,
          img: doc.img,
          system: 'sf2e',
          systemData: {
            level,
            traits,
            creatureType,
            size,
            rarity,
            hasSpellcasting,
            hitPoints,
            armorClass,
            staminaPoints,
            resolvePoints
          }
        },
        errors: 0
      };

    } catch (error) {
      console.warn(`[${this.moduleId}] Failed to extract SF2e data from ${doc.name}:`, error);

      return {
        creature: {
          id: doc._id,
          name: doc.name,
          type: doc.type,
          packName: pack.metadata.id,
          packLabel: pack.metadata.label,
          img: doc.img || '',
          system: 'sf2e',
          systemData: {
            level: 0,
            traits: [],
            creatureType: 'unknown',
            size: 'medium',
            rarity: 'common',
            hasSpellcasting: false,
            hitPoints: 1,
            armorClass: 10
          }
        },
        errors: 1
      };
    }
  }
}
