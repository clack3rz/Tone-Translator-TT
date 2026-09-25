// src/sound-engineer/contracts/immutability.ts
// Runtime immutability utilities for Sound Engineer contracts

/**
 * Recursively freezes an object and its nested properties, preventing runtime mutation.
 * Specially guarded against Blobs, File objects, and ArrayBuffers so large binary data
 * is not traversed or degraded.
 */
export function deepFreeze<T>(obj: T, visited: WeakSet<object> = new WeakSet()): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Avoid traversing into binary buffers, Blobs, or Files
  if (typeof Blob !== "undefined" && obj instanceof Blob) {
    return obj as Readonly<T>;
  }
  if (typeof ArrayBuffer !== "undefined" && (obj instanceof ArrayBuffer || ArrayBuffer.isView(obj))) {
    return obj as Readonly<T>;
  }

  // Avoid infinite loops on cyclic references
  if (visited.has(obj as object)) {
    return obj as Readonly<T>;
  }
  visited.add(obj as object);

  // Freeze the object itself
  if (!Object.isFrozen(obj)) {
    Object.freeze(obj);
  }

  // Recursively freeze all property values
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as any)[name];
    if (value !== null && typeof value === "object") {
      deepFreeze(value, visited);
    }
  }

  return obj as Readonly<T>;
}

/**
 * Creates a defensive deep clone of a plain serializable object before freezing,
 * ensuring mutations to the source object cannot affect the frozen target.
 */
export function defensiveClone<T>(source: T): T {
  if (source === null || typeof source !== "object") {
    return source;
  }

  // Preserve Blobs and Files by reference without attempting JSON cloning
  if (typeof Blob !== "undefined" && source instanceof Blob) {
    return source;
  }
  if (typeof ArrayBuffer !== "undefined" && (source instanceof ArrayBuffer || ArrayBuffer.isView(source))) {
    return source;
  }

  if (Array.isArray(source)) {
    return source.map((item) => defensiveClone(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(source as object)) {
    const val = (source as any)[key];
    result[key] = defensiveClone(val);
  }

  return result as T;
}
