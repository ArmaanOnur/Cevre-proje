/**
 * CQRS Barrel — T7
 *
 * Single import point for the command/query infrastructure.
 *
 *   import { commandBus, queryBus, setupCQRS } from '@/cqrs'
 *
 * setupCQRS() MUST be called once before any dispatch/execute calls.
 * It is idempotent — safe to call multiple times (guarded by a flag).
 */

export { commandBus, CommandBus } from './command-bus'
export { queryBus, QueryBus } from './query-bus'

export type { Command, CommandType, CommandResultMap } from './commands/types'
export type { Query, QueryType, QueryResultMap } from './queries/types'

import { commandBus } from './command-bus'
import { queryBus } from './query-bus'
import { registerCommandHandlers } from './commands/handlers'
import { registerQueryHandlers } from './queries/handlers'

// ─────────────────────────────────────────────────────────────────────────────
// One-time setup guard
// ─────────────────────────────────────────────────────────────────────────────

const SETUP_KEY = '__cevre_cqrs_setup__'

function isSetupDone(): boolean {
  if (typeof globalThis === 'undefined') return false
  return !!(globalThis as Record<string, unknown>)[SETUP_KEY]
}

function markSetupDone(): void {
  ;(globalThis as Record<string, unknown>)[SETUP_KEY] = true
}

/**
 * Register all command and query handlers.
 *
 * Call this ONCE at app startup (client side) — typically from
 * EventHandlerProvider's useEffect or a dedicated CQRSProvider.
 *
 * @returns cleanup function that clears all handlers (useful for tests)
 */
export function setupCQRS(): () => void {
  if (isSetupDone()) return () => {}

  markSetupDone()

  registerCommandHandlers()
  registerQueryHandlers()

  return () => {
    commandBus.clear()
    queryBus.clear()
    ;(globalThis as Record<string, unknown>)[SETUP_KEY] = false
  }
}
