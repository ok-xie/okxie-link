import { AbortError } from '../errors/abort-error.js'
import { HttpError } from '../errors/http-error.js'
import { NetworkError } from '../errors/network-error.js'
import { TimeoutError } from '../errors/timeout-error.js'
import { buildBody } from '../helpers/body.js'
import { buildUrl } from '../helpers/query.js'
import type { ResolvedRequestConfig } from '../types/http.js'
import type { HttpTransport, TransportCapabilities } from '../types/transport.js'

export class FetchTransport implements HttpTransport {
  readonly capabilities: TransportCapabilities

  constructor() {
    this.capabilities = {
      uploadProgress: false,
      downloadProgress: false,
      streamingRequestBody: true,
    }
  }

  async request(config: ResolvedRequestConfig): Promise<Response> {
    const realUrl = buildUrl(config.baseUrl, config.url, config.query)
    const { signal, source } = createRequestSignal(config)
    const { body, headers } = buildBody(config.body, config.headers)
    const requestInit: RequestInit = {
      ...config,
      headers,
      body,
      signal,
    }

    delete (requestInit as Partial<ResolvedRequestConfig>).baseUrl
    delete (requestInit as Partial<ResolvedRequestConfig>).query
    delete (requestInit as Partial<ResolvedRequestConfig>).timeout
    delete (requestInit as Partial<ResolvedRequestConfig>).url

    try {
      const response = await fetch(realUrl, requestInit)

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status} ${response.statusText} - ${realUrl}`,
          response.status,
          realUrl,
        )
      }

      return response
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }

      const isAbortError = error instanceof Error && error.name === 'AbortError'

      if (isAbortError && source === 'timeout') {
        throw new TimeoutError(`Request timed out - ${realUrl}`, realUrl, error)
      }

      if (isAbortError && source === 'user') {
        throw new AbortError(`Request was aborted - ${realUrl}`, realUrl, error)
      }

      throw new NetworkError(`Network request failed - ${realUrl}`, realUrl, error as Error)
    }
  }
}

export function createFetchTransport(): HttpTransport {
  return new FetchTransport()
}

type RequestSignalResult = {
  signal?: AbortSignal
  source: 'user' | 'timeout' | 'none'
}

function createRequestSignal(config: ResolvedRequestConfig): RequestSignalResult {
  if (config.signal) {
    return {
      signal: config.signal,
      source: 'user',
    }
  }

  if (config.timeout != null) {
    return {
      signal: AbortSignal.timeout(config.timeout),
      source: 'timeout',
    }
  }

  return {
    signal: undefined,
    source: 'none',
  }
}
