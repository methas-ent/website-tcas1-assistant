/**
 * Node-safe uploaded-file detection for server routes / actions.
 *
 * The server runtime does not guarantee a global `File` constructor — on some
 * Node versions it is undefined, so `value instanceof File` throws
 * `ReferenceError: File is not defined` at request time. Duck-type the value
 * instead: a multipart upload entry exposes `arrayBuffer()` + a numeric `size`
 * (and usually `name`/`type`, which are optional here).
 *
 * Returns a `File` type guard purely for ergonomics with existing helpers that
 * are typed against the DOM `File` (the type is erased at runtime; we never
 * reference the `File` value).
 */
export function isUploadedFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    "size" in value &&
    typeof (value as { size?: unknown }).size === "number" &&
    (value as { size: number }).size > 0
  );
}
