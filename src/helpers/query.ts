import type { QueryRecord } from '../types/http.js'

export function mergeQuery(baseQuery?: QueryRecord, overrideQuery?: QueryRecord): QueryRecord {
  return {
    ...(baseQuery ?? {}),
    ...(overrideQuery ?? {}),
  }
}

export function buildUrl(baseUrl: string, url: string, query: QueryRecord): string {
  const joinedUrl = joinUrl(baseUrl, url)
  const isAbsolute = /^https?:\/\//.test(joinedUrl)
  const urlObject = isAbsolute ? new URL(joinedUrl) : new URL(joinedUrl, 'http://okxie-link.local')

  Object.keys(query).forEach((key) => {
    const value = query[key]

    if (value === null || value === undefined) {
      return
    }

    urlObject.searchParams.set(key, String(value))
  })

  if (isAbsolute) {
    return urlObject.toString()
  }

  return `${urlObject.pathname}${urlObject.search}${urlObject.hash}`
}

export function joinUrl(baseUrl: string, url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url
  }

  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  if (url.startsWith('/')) {
    url = url.slice(1)
  }

  return `${baseUrl}/${url}`
}
