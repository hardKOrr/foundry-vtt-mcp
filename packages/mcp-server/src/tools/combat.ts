import { z } from 'zod';
import { FoundryClient } from '../foundry-client.js';
import { Logger } from '../logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

export interface CombatToolsOptions {
  foundryClient: FoundryClient;
  logger: Logger;
}

export class CombatTools {
  private foundryClient: FoundryClient;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor({ foundryClient, logger }: CombatToolsOptions) {
    this.foundryClient = foundryClient;
    this.logger = logger.child({ component: 'CombatTools' });
    this.errorHandler = new ErrorHandler(this.logger);
  }

  /**
   * Tool definitions for combat tracker operations
   */
  getToolDefinitions() {
    return [
      {
        name: 'get-combat-state',
        description: 'Get the current state of the active combat encounter: round, turn, initiative order, and combatant HP.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'start-combat',
        description: 'Create a new combat encounter in the active scene and optionally add specific tokens by ID. To roll initiative, call roll-combat-initiative as a separate step after this.',
        inputSchema: {
          type: 'object',
          properties: {
            tokenIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Token IDs to add to the encounter. Use get-current-scene to find token IDs.',
            },
          },
        },
      },
      {
        name: 'add-combatants',
        description: 'Add one or more tokens from the active scene to the current combat encounter.',
        inputSchema: {
          type: 'object',
          properties: {
            tokenIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Token IDs to add to combat',
              minItems: 1,
            },
          },
          required: ['tokenIds'],
        },
      },
      {
        name: 'set-combatant-initiative',
        description: "Set a specific combatant's initiative value.",
        inputSchema: {
          type: 'object',
          properties: {
            combatantId: {
              type: 'string',
              description: 'Combatant ID (from get-combat-state)',
            },
            initiative: {
              type: 'number',
              description: 'Initiative value to set',
            },
          },
          required: ['combatantId', 'initiative'],
        },
      },
      {
        name: 'roll-combat-initiative',
        description: 'Roll initiative for all combatants (or a specific subset by combatant ID) using each actor\'s configured initiative skill. No dialog.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Combatant IDs to roll for. Omit to roll for everyone.',
            },
          },
        },
      },
      {
        name: 'roll-npc-initiative',
        description: 'Roll initiative for NPC combatants only, using each actor\'s configured initiative skill. Player combatants are skipped. No dialog.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'begin-combat',
        description: 'Start the active combat encounter — sets round 1 and locks in the initiative order. Call this after all initiative has been rolled.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'next-combat-turn',
        description: 'Advance the combat tracker to the next turn.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'previous-combat-turn',
        description: 'Go back to the previous turn in the combat tracker.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'end-combat',
        description: 'End and delete the active combat encounter.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Handle getting the current combat state
   */
  async handleGetCombatState(_args: any): Promise<any> {
    this.logger.info('Getting combat state');
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.getCombatState', {});
    } catch (error) {
      this.errorHandler.handleToolError(error, 'get-combat-state', 'combat state retrieval');
    }
  }

  /**
   * Handle starting a new combat encounter
   */
  async handleStartCombat(args: any): Promise<any> {
    const schema = z.object({
      tokenIds: z.array(z.string()).optional(),
    });

    const params = schema.parse(args);
    this.logger.info('Starting combat', { tokenCount: params.tokenIds?.length ?? 0 });

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.createCombat', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'start-combat', 'combat creation');
    }
  }

  /**
   * Handle adding combatants to the active encounter
   */
  async handleAddCombatants(args: any): Promise<any> {
    const schema = z.object({
      tokenIds: z.array(z.string()).min(1, 'At least one token ID is required'),
    });

    const params = schema.parse(args);
    this.logger.info('Adding combatants', { count: params.tokenIds.length });

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.addCombatants', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'add-combatants', 'combatant addition');
    }
  }

  /**
   * Handle setting a combatant's initiative
   */
  async handleSetCombatantInitiative(args: any): Promise<any> {
    const schema = z.object({
      combatantId: z.string().min(1),
      initiative: z.number(),
    });

    const params = schema.parse(args);
    this.logger.info('Setting initiative', params);

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.setCombatantInitiative', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'set-combatant-initiative', 'initiative update');
    }
  }

  /**
   * Handle rolling initiative for combatants
   */
  async handleRollCombatInitiative(args: any): Promise<any> {
    const schema = z.object({
      ids: z.array(z.string()).optional(),
    });

    const params = schema.parse(args);
    this.logger.info('Rolling combat initiative', { ids: params.ids });

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.rollCombatInitiative', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'roll-combat-initiative', 'initiative roll');
    }
  }

  /**
   * Handle advancing to the next combat turn
   */
  async handleNextCombatTurn(_args: any): Promise<any> {
    this.logger.info('Advancing combat turn');
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.nextCombatTurn', {});
    } catch (error) {
      this.errorHandler.handleToolError(error, 'next-combat-turn', 'turn advance');
    }
  }

  /**
   * Handle going back to the previous combat turn
   */
  async handlePreviousCombatTurn(_args: any): Promise<any> {
    this.logger.info('Rewinding combat turn');
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.previousCombatTurn', {});
    } catch (error) {
      this.errorHandler.handleToolError(error, 'previous-combat-turn', 'turn rewind');
    }
  }

  /**
   * Handle ending the active combat encounter
   */
  async handleEndCombat(_args: any): Promise<any> {
    this.logger.info('Ending combat');
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.endCombat', {});
    } catch (error) {
      this.errorHandler.handleToolError(error, 'end-combat', 'combat end');
    }
  }

  /**
   * Handle rolling initiative for NPC combatants only
   */
  async handleRollNPCInitiative(_args: any): Promise<any> {
    this.logger.info('Rolling NPC initiative');
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.rollNPCInitiative', {});
    } catch (error) {
      this.errorHandler.handleToolError(error, 'roll-npc-initiative', 'NPC initiative roll');
    }
  }

  /**
   * Handle starting the active combat encounter (round 1, locks order)
   */
  async handleBeginCombat(_args: any): Promise<any> {
    this.logger.info('Beginning combat (round 1)');
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.startCombat', {});
    } catch (error) {
      this.errorHandler.handleToolError(error, 'begin-combat', 'combat start');
    }
  }
}
