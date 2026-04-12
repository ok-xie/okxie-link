export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function buildBody(
  body: unknown,
  headers: Headers,
): { body: BodyInit | null; headers: Headers } {
  const nextHeaders = new Headers(headers)

  if (typeof body === 'string') {
    return {
      body,
      headers: nextHeaders,
    }
  }

  if (body instanceof FormData) {
    return {
      body,
      headers: nextHeaders,
    }
  }

  if (body === null || body === undefined) {
    return {
      body: null,
      headers: nextHeaders,
    }
  }

  if (Array.isArray(body) || isPlainObject(body)) {
    nextHeaders.set('Content-Type', 'application/json')
    return {
      body: JSON.stringify(body),
      headers: nextHeaders,
    }
  }

  return {
    body: body as BodyInit,
    headers: nextHeaders,
  }
}
