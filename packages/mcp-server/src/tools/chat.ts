import { z } from 'zod';
import { FoundryClient } from '../foundry-client.js';
import { Logger } from '../logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

export interface ChatToolsOptions {
  foundryClient: FoundryClient;
  logger: Logger;
}

export class ChatTools {
  private foundryClient: FoundryClient;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor({ foundryClient, logger }: ChatToolsOptions) {
    this.foundryClient = foundryClient;
    this.logger = logger.child({ component: 'ChatTools' });
    this.errorHandler = new ErrorHandler(this.logger);
  }

  /**
   * Tool definitions for chat message operations
   */
  getToolDefinitions() {
    return [
      {
        name: 'send-chat-message',
        description: 'Send a chat message to the Foundry VTT chat log. Supports plain text, emotes, whispers, and out-of-character messages.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The message text to send',
            },
            type: {
              type: 'string',
              enum: ['ic', 'ooc', 'emote', 'whisper', 'roll'],
              description: 'Message type: "ic" (in character), "ooc" (out of character), "emote", "whisper", or "roll" (default: "ooc")',
              default: 'ooc',
            },
            whisperTargets: {
              type: 'array',
              items: { type: 'string' },
              description: 'User names or IDs to whisper to (only used when type is "whisper")',
            },
            speaker: {
              type: 'object',
              description: 'Speaker identity for in-character messages',
              properties: {
                alias: {
                  type: 'string',
                  description: 'Display name for the speaker',
                },
                actorId: {
                  type: 'string',
                  description: 'Actor ID to speak as',
                },
              },
            },
          },
          required: ['content'],
        },
      },
    ];
  }

  /**
   * Handle sending a chat message to the Foundry chat log
   */
  async handleSendChatMessage(args: any): Promise<any> {
    const schema = z.object({
      content: z.string().min(1, 'Message content cannot be empty'),
      type: z.enum(['ic', 'ooc', 'emote', 'whisper', 'roll']).default('ooc'),
      whisperTargets: z.array(z.string()).optional(),
      speaker: z.object({
        alias: z.string().optional(),
        actorId: z.string().optional(),
      }).optional(),
    });

    const params = schema.parse(args);
    this.logger.info('Sending chat message', { type: params.type, hasWhisper: !!params.whisperTargets?.length });

    try {
      return await this.foundryClient.query('foundry-mcp-bridge.sendChatMessage', params);
    } catch (error) {
      this.errorHandler.handleToolError(error, 'send-chat-message', 'chat message');
    }
  }
}
