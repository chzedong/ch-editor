export function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    console.error(message)
    throw new Error(message)
  }
}