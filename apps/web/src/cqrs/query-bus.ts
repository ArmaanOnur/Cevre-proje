/**
 * QueryBus — T7 CQRS Read Side
 *
 * Typed query dispatcher for imperative / non-hook read paths.
 * SWR-backed hooks are the primary read projection; QueryBus is used
 * for server components, server actions, and cross-domain aggregations.
 *
 * USAGE:
 *   import { queryBus } from '@/cqrs'
 *
 *   const status = await queryBus.execute({
 *     type: 'GET_FOLLOW_STATUS',
 *     payload: { viewerId, targetId },
 *   })
 *   // status is typed as FollowStatus
 */

import type { Query, QueryType, QueryResultMap } from './queries/types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ExtractQuery<T extends QueryType> = Extract<Query, { type: T }>
type QueryHandler<T extends QueryType> = (
  query: ExtractQuery<T>
) => Promise<QueryResultMap[T]>

// ─────────────────────────────────────────────────────────────────────────────
// QueryBus class
// ─────────────────────────────────────────────────────────────────────────────

class QueryBus {
  private readonly _handlers = new Map<string, QueryHandler<QueryType>>()

  /**
   * Register a handler for a query type.
   */
  register<T extends QueryType>(type: T, handler: QueryHandler<T>): void {
    this._handlers.set(type, handler as QueryHandler<QueryType>)
  }

  /**
   * Execute a query and return its result.
   * Throws if no handler is registered.
   */
  async execute<T extends QueryType>(
    query: ExtractQuery<T>
  ): Promise<QueryResultMap[T]> {
    const handler = this._handlers.get(query.type) as QueryHandler<T> | undefined
    if (!handler) {
      throw new Error(
        `[QueryBus] No handler registered for query "${query.type}". ` +
        `Did you call setupCQRS()?`
      )
    }
    return handler(query)
  }

  /**
   * Returns true if a handler is registered for the given query type.
   */
  isRegistered(type: QueryType): boolean {
    return this._handlers.has(type)
  }

  /**
   * Remove all registered handlers (use in tests).
   */
  clear(): void {
    this._handlers.clear()
  }

  get size(): number {
    return this._handlers.size
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_KEY = '__cevre_query_bus__'

function getOrCreate(): QueryBus {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as Record<string, unknown>
    if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new QueryBus()
    return g[GLOBAL_KEY] as QueryBus
  }
  return new QueryBus()
}

export const queryBus: QueryBus = getOrCreate()

// Re-export for tests that need a fresh instance
export { QueryBus }
