/**
 * Vitest global test setup
 */
import '@testing-library/jest-dom'

// Suppress console.warn in tests unless DEBUG_TESTS=1
if (!process.env.DEBUG_TESTS) {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
}
