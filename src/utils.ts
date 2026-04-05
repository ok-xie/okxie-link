import type { BuildSignalResult, ClientConfig, QueryType, RequestConfig } from './types.js'

export function buildUrl(baseUrl: string, url: string, query: QueryType) {
  const urlObj = new URL(joinURL(baseUrl, url))
  Object.keys(query).forEach((key) => {
    if (query[key] === null || query[key] === undefined) {
      return
    }
    urlObj.searchParams.set(key, query[key].toString())
  })
  return urlObj.toString()
}

export function joinURL(baseUrl: string, url: string) {
  if (/^https?:\/\//.test(url)) {
    return url
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, baseUrl.length - 1)
  }
  if (url.startsWith('/')) {
    url = url.slice(1, url.length)
  }
  return `${baseUrl}/${url}`
}

export function buildBody(
  body: unknown,
  headers: Headers,
): { body: BodyInit | null; headers: Headers } {
  headers = new Headers(headers)
  if (typeof body === 'string') {
    return {
      body,
      headers,
    }
  }

  if (body instanceof FormData) {
    return {
      body,
      headers,
    }
  }

  if (body === null || body === undefined) {
    return {
      body: null,
      headers,
    }
  }
  if (Array.isArray(body) || isPlainObject(body)) {
    headers.set('Content-Type', 'application/json')
    return {
      body: JSON.stringify(body),
      headers,
    }
  }
  return {
    body: body as BodyInit,
    headers,
  }
}

export function isPlainObject(obj: unknown) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export function buildSignal(rcfg: RequestConfig, ccfg: ClientConfig): BuildSignalResult {
  if (rcfg.signal) {
    return {
      signal: rcfg.signal,
      source: 'user',
    }
  }

  if (rcfg.timeout != null) {
    return {
      signal: AbortSignal.timeout(rcfg.timeout),
      source: 'timeout',
    }
  }

  if (ccfg.timeout != null) {
    return {
      signal: AbortSignal.timeout(ccfg.timeout),
      source: 'timeout',
    }
  }

  return {
    signal: undefined,
    source: 'none',
  }
}
