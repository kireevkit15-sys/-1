/**
 * Safely extract error message from unknown catch clause value.
 * Usage: catch (err: unknown) { logger.error(getErrorMessage(err)); }
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

/**
 * Safely extract error name from unknown catch clause value.
 * Returns undefined if err is not an Error instance.
 */
export function getErrorName(err: unknown): string | undefined {
  if (err instanceof Error) return err.name;
  return undefined;
}
