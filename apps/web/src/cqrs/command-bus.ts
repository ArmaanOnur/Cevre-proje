/**
 * CommandBus — T7 CQRS Write Side
 *
 * Typed command dispatcher. Decouples the caller (hooks, server actions)
 * from the concrete handler (service layer).
 *
 * USAGE:
 *   import { commandBus } from '@/cqrs'
 *
 *   // Register a handler (done once at app startup via setupCQRS)
 *   commandBus.register('CREATE_POST', async ({ payload }) =>
 *     FeedService.createPost(payload)
 *   )
 *
 *   // Dispatch from a hook or server action
 *   const result = await commandBus.dispatch({
 *     type: 'CREATE_POST',
 *     payload: { content: 'Hello world!' },
 *   })
 *   // result is fully typed as { data: ...; error: ... }
 */

import type { Command, CommandType, CommandResultMap } from './commands/types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ExtractCommand<T extends CommandType> = Extract<Command, { type: T }>
type CommandHandler<T extends CommandType> = (
  command: ExtractCommand<T>
) => Promise<CommandResultMap[T]>

// ─────────────────────────────────────────────────────────────────────────────
// CommandBus class
// ─────────────────────────────────────────────────────────────────────────────

class CommandBus {
  private readonly _handlers = new Map<string, CommandHandler<CommandType>>()

  /**
   * Register a handler for a command type.
   * Overwrites any previously registered handler for the same type.
   */
  register<T extends CommandType>(type: T, handler: CommandHandler<T>): void {
    this._handlers.set(type, handler as CommandHandler<CommandType>)
  }

  /**
   * Dispatch a command.
   * Finds the registered handler and returns its result.
   * Throws if no handler is registered for the command type.
   */
  async dispatch<T extends CommandType>(
    command: ExtractCommand<T>
  ): Promise<CommandResultMap[T]> {
    const handler = this._handlers.get(command.type) as CommandHandler<T> | undefined
    if (!handler) {
      throw new Error(
        `[CommandBus] No handler registered for command "${command.type}". ` +
        `Did you call setupCQRS()?`
      )
    }
    return handler(command)
  }

  /**
   * Returns true if a handler is registered for the given command type.
   * Useful for guarding dispatch calls and for tests.
   */
  isRegistered(type: CommandType): boolean {
    return this._handlers.has(type)
  }

  /**
   * Remove all registered handlers.
   * Use in tests to get a clean slate.
   */
  clear(): void {
    this._handlers.clear()
  }

  /** Number of currently registered handlers */
  get size(): number {
    return this._handlers.size
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_KEY = '__cevre_command_bus__'

function getOrCreate(): CommandBus {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as Record<string, unknown>
    if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new CommandBus()
    return g[GLOBAL_KEY] as CommandBus
  }
  return new CommandBus()
}

export const commandBus: CommandBus = getOrCreate()

// Re-export for tests that need a fresh instance
export { CommandBus }
