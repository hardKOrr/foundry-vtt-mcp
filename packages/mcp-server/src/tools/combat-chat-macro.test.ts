import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatTools } from './combat.js';
import { ChatTools } from './chat.js';
import { MacroTools } from './macro.js';
import { ActorCreationTools } from './actor-creation.js';

// ─── Shared mock helpers ──────────────────────────────────────────────────────

function makeClient(returnValue: any = { success: true }) {
  return { query: vi.fn().mockResolvedValue(returnValue) };
}

function makeLogger() {
  const noop = vi.fn();
  return { info: noop, debug: noop, warn: noop, error: noop, child: vi.fn().mockReturnThis() };
}

// ─── CombatTools ─────────────────────────────────────────────────────────────

describe('CombatTools', () => {
  let client: ReturnType<typeof makeClient>;
  let tools: CombatTools;

  beforeEach(() => {
    client = makeClient();
    tools = new CombatTools({ foundryClient: client as any, logger: makeLogger() as any });
  });

  it('exposes all 8 expected tool names', () => {
    const names = tools.getToolDefinitions().map(t => t.name);
    expect(names).toEqual([
      'get-combat-state',
      'start-combat',
      'add-combatants',
      'set-combatant-initiative',
      'roll-combat-initiative',
      'next-combat-turn',
      'previous-combat-turn',
      'end-combat',
    ]);
  });

  it('handleGetCombatState calls getCombatState query', async () => {
    await tools.handleGetCombatState({});
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.getCombatState', {});
  });

  it('handleStartCombat defaults rollInitiative to false', async () => {
    await tools.handleStartCombat({});
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.createCombat',
      expect.objectContaining({ rollInitiative: false }),
    );
  });

  it('handleStartCombat passes tokenIds and rollInitiative when provided', async () => {
    await tools.handleStartCombat({ tokenIds: ['tok1', 'tok2'], rollInitiative: true });
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.createCombat', {
      tokenIds: ['tok1', 'tok2'],
      rollInitiative: true,
    });
  });

  it('handleAddCombatants rejects empty tokenIds', async () => {
    await expect(tools.handleAddCombatants({ tokenIds: [] })).rejects.toThrow();
  });

  it('handleAddCombatants passes valid tokenIds', async () => {
    await tools.handleAddCombatants({ tokenIds: ['tok1'] });
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.addCombatants', { tokenIds: ['tok1'] });
  });

  it('handleSetCombatantInitiative requires combatantId and initiative', async () => {
    await expect(tools.handleSetCombatantInitiative({})).rejects.toThrow();
    await expect(tools.handleSetCombatantInitiative({ combatantId: 'c1' })).rejects.toThrow();
  });

  it('handleSetCombatantInitiative passes correct params', async () => {
    await tools.handleSetCombatantInitiative({ combatantId: 'c1', initiative: 18 });
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.setCombatantInitiative', {
      combatantId: 'c1',
      initiative: 18,
    });
  });

  it('handleNextCombatTurn calls nextCombatTurn query', async () => {
    await tools.handleNextCombatTurn({});
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.nextCombatTurn', {});
  });

  it('handlePreviousCombatTurn calls previousCombatTurn query', async () => {
    await tools.handlePreviousCombatTurn({});
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.previousCombatTurn', {});
  });

  it('handleEndCombat calls endCombat query', async () => {
    await tools.handleEndCombat({});
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.endCombat', {});
  });
});

// ─── ChatTools ────────────────────────────────────────────────────────────────

describe('ChatTools', () => {
  let client: ReturnType<typeof makeClient>;
  let tools: ChatTools;

  beforeEach(() => {
    client = makeClient();
    tools = new ChatTools({ foundryClient: client as any, logger: makeLogger() as any });
  });

  it('exposes send-chat-message tool', () => {
    const names = tools.getToolDefinitions().map(t => t.name);
    expect(names).toContain('send-chat-message');
  });

  it('handleSendChatMessage rejects empty content', async () => {
    await expect(tools.handleSendChatMessage({ content: '' })).rejects.toThrow();
  });

  it('handleSendChatMessage defaults type to ooc', async () => {
    await tools.handleSendChatMessage({ content: 'Hello world' });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.sendChatMessage',
      expect.objectContaining({ content: 'Hello world', type: 'ooc' }),
    );
  });

  it('handleSendChatMessage accepts whisper type with targets', async () => {
    await tools.handleSendChatMessage({ content: 'Psst', type: 'whisper', whisperTargets: ['Alice'] });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.sendChatMessage',
      expect.objectContaining({ type: 'whisper', whisperTargets: ['Alice'] }),
    );
  });

  it('handleSendChatMessage rejects unknown type', async () => {
    await expect(tools.handleSendChatMessage({ content: 'Hi', type: 'shout' })).rejects.toThrow();
  });
});

// ─── MacroTools ───────────────────────────────────────────────────────────────

describe('MacroTools', () => {
  let client: ReturnType<typeof makeClient>;
  let tools: MacroTools;

  beforeEach(() => {
    client = makeClient({ macros: [] });
    tools = new MacroTools({ foundryClient: client as any, logger: makeLogger() as any });
  });

  it('exposes list-macros, run-macro, create-macro', () => {
    const names = tools.getToolDefinitions().map(t => t.name);
    expect(names).toEqual(['list-macros', 'run-macro', 'create-macro']);
  });

  it('handleListMacros with no args passes empty params', async () => {
    await tools.handleListMacros({});
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.listMacros', {});
  });

  it('handleListMacros forwards nameFilter and type', async () => {
    await tools.handleListMacros({ nameFilter: 'heal', type: 'script' });
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.listMacros', {
      nameFilter: 'heal',
      type: 'script',
    });
  });

  it('handleListMacros rejects unknown macro type', async () => {
    await expect(tools.handleListMacros({ type: 'unknown' })).rejects.toThrow();
  });

  it('handleRunMacro rejects empty nameOrId', async () => {
    await expect(tools.handleRunMacro({ nameOrId: '' })).rejects.toThrow();
  });

  it('handleRunMacro calls executeMacro with correct params', async () => {
    await tools.handleRunMacro({ nameOrId: 'Heal Party' });
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.executeMacro', { nameOrId: 'Heal Party' });
  });

  it('handleCreateMacro rejects missing name or command', async () => {
    await expect(tools.handleCreateMacro({ name: 'Test' })).rejects.toThrow();
    await expect(tools.handleCreateMacro({ command: 'console.log()' })).rejects.toThrow();
  });

  it('handleCreateMacro defaults type to script', async () => {
    await tools.handleCreateMacro({ name: 'MyMacro', command: 'console.log("hi")' });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.createMacro',
      expect.objectContaining({ type: 'script' }),
    );
  });

  it('handleCreateMacro accepts chat type', async () => {
    await tools.handleCreateMacro({ name: 'Announce', command: '/shout hello', type: 'chat' });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.createMacro',
      expect.objectContaining({ type: 'chat', name: 'Announce' }),
    );
  });
});

// ─── ActorCreationTools — update-actor-hp ─────────────────────────────────────

describe('ActorCreationTools — handleUpdateActorHp', () => {
  let client: ReturnType<typeof makeClient>;
  let tools: ActorCreationTools;

  beforeEach(() => {
    client = makeClient({ success: true, actorName: 'Goblin', currentHp: 10, maxHp: 20 });
    tools = new ActorCreationTools({ foundryClient: client as any, logger: makeLogger() as any });
  });

  it('exposes update-actor-hp tool definition', () => {
    const names = tools.getToolDefinitions().map(t => t.name);
    expect(names).toContain('update-actor-hp');
  });

  it('rejects missing actorId', async () => {
    await expect(tools.handleUpdateActorHp({ current: 10 })).rejects.toThrow();
  });

  it('rejects when no HP field is provided', async () => {
    await expect(tools.handleUpdateActorHp({ actorId: 'abc123' })).rejects.toThrow();
  });

  it('passes current HP update', async () => {
    await tools.handleUpdateActorHp({ actorId: 'abc123', current: 15 });
    expect(client.query).toHaveBeenCalledWith('foundry-mcp-bridge.updateActorResource', {
      actorId: 'abc123',
      current: 15,
    });
  });

  it('passes delta (damage/healing)', async () => {
    await tools.handleUpdateActorHp({ actorId: 'abc123', delta: -5 });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.updateActorResource',
      expect.objectContaining({ actorId: 'abc123', delta: -5 }),
    );
  });

  it('passes max HP update', async () => {
    await tools.handleUpdateActorHp({ actorId: 'abc123', max: 30 });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.updateActorResource',
      expect.objectContaining({ max: 30 }),
    );
  });

  it('passes temp HP update', async () => {
    await tools.handleUpdateActorHp({ actorId: 'abc123', temp: 5 });
    expect(client.query).toHaveBeenCalledWith(
      'foundry-mcp-bridge.updateActorResource',
      expect.objectContaining({ temp: 5 }),
    );
  });
});
