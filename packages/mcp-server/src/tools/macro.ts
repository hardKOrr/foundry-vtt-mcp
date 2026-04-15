import { z } from 'zod';
import { FoundryClient } from '../foundry-client.js';
import { Logger } from '../logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

export interface MacroToolsOptions {
  foundryClient: FoundryClient;
  logger: Logger;
}

export class MacroTools {
  private foundryClient: FoundryClient;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor({ foundryClient, logger }: MacroToolsOptions) {
    this.foundryClient = foundryClient;
    this.logger = logger.child({ component: 'MacroTools' });
    this.errorHandler = new ErrorHandler(this.logger);
  }

  /**
   * Tool definitions for macro operations
   */
  getToolDefinitions() {
    return [
      {
        name: 'list-macros',
        description: 'List all macros available in the world, optionally filtered by name or type.',
        inputSchema: {
          type: 'object',
          properties: {
            nameFilter: {
              type: 'string',
              description: 'Partial name to filter macros by (case-insensitive)',
            },
            type: {
              type: 'string',
              enum: ['script', 'chat'],
              description: 'Filter by macro type: "script" (JavaScript) or "chat" (chat command)',
            },
          },
        },
      },
      {
        name: 'run-macro',
        description: 'Execute an existing macro by name or ID.',
        inputSchema: {
          type: 'object',
          properties: {
            nameOrId: {
              type: 'string',
              description: 'The name or ID of the macro to execute',
            },
          },
          required: ['nameOrId'],
        },
      },
      {
        name: 'create-macro',
        description: 'Create a new macro in the world.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the macro',
            },
            type: {
              type: 'string',
              enum: ['script', 'chat'],
              description: 'Macro type: "script" for JavaScript or "chat" for a chat command (default: "script")',
              default: 'script',
            },
            command: {
              type: 'string',
              description: 'The macro body — JavaScript code for script macros, chat text for chat macros',
            },
            img: {
              type: 'string',
              description: 'Icon path or URL for the macro button (optional)',
            },
          },
          required: ['name', 'command'],
        },
      },
    ];
  }

  /**
   * Handle listing macros in the world
   */
  async handleListMacros(args: any): Promise<any> {
    const schema = z.object({
      nameFilter: z.string().optional(),
      type: z.enum(['script', 'chat']).optional(),
    });

    const params = schema.parse(args);
    this.logger.info('Listing macros', params);

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.listMacros', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'list-macros', 'macro listing');
    }
  }

  /**
   * Handle executing a macro by name or ID
   */
  async handleRunMacro(args: any): Promise<any> {
    const schema = z.object({
      nameOrId: z.string().min(1, 'Macro name or ID cannot be empty'),
    });

    const params = schema.parse(args);
    this.logger.info('Running macro', { nameOrId: params.nameOrId });

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.executeMacro', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'run-macro', 'macro execution');
    }
  }

  /**
   * Handle creating a new macro
   */
  async handleCreateMacro(args: any): Promise<any> {
    const schema = z.object({
      name: z.string().min(1, 'Macro name cannot be empty'),
      type: z.enum(['script', 'chat']).default('script'),
      command: z.string().min(1, 'Macro command cannot be empty'),
      img: z.string().optional(),
    });

    const params = schema.parse(args);
    this.logger.info('Creating macro', { name: params.name, type: params.type });

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.createMacro', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'create-macro', 'macro creation');
    }
  }
}
