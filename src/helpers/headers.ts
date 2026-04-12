export function mergeHeaders(baseHeaders?: HeadersInit, overrideHeaders?: HeadersInit): Headers {
  const mergedHeaders = new Headers(baseHeaders)
  const nextHeaders = new Headers(overrideHeaders)

  nextHeaders.forEach((value, key) => {
    mergedHeaders.set(key, value)
  })

  return mergedHeaders
}
