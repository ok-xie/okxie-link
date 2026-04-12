import type { ResolvedRequestConfig } from '../types/http.js'
import type { HttpContext } from '../types/middleware.js'
import { mergeHeaders } from '../helpers/headers.js'

export class DefaultHttpContext<TData = unknown, TJson = unknown>
  implements HttpContext<TData, TJson>
{
  request: ResolvedRequestConfig
  response?: Response
  error?: unknown
  data?: TData
  state: Record<string, unknown>
  private jsonCache?: Promise<TJson>
  private textCache?: Promise<string>

  constructor(request: ResolvedRequestConfig) {
    this.request = request
    this.state = {}
  }

  async json(): Promise<TJson> {
    const response = this.ensureResponse()

    if (!this.jsonCache) {
      this.jsonCache = response.clone().json() as Promise<TJson>
    }

    return this.jsonCache
  }

  async text(): Promise<string> {
    const response = this.ensureResponse()

    if (!this.textCache) {
      this.textCache = response.clone().text()
    }

    return this.textCache
  }

  setResponse(response: Response): void {
    this.response = response
    this.jsonCache = undefined
    this.textCache = undefined
  }

  setJson(value: unknown, init?: ResponseInit): void {
    const body = JSON.stringify(value)
    const headers = mergeHeaders(this.response?.headers, init?.headers)

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    this.response = new Response(body, {
      status: init?.status ?? this.response?.status ?? 200,
      statusText: init?.statusText ?? this.response?.statusText,
      headers,
    })

    this.jsonCache = Promise.resolve(value as TJson)
    this.textCache = Promise.resolve(body)
  }

  throw(error: unknown): never {
    throw error
  }

  private ensureResponse(): Response {
    if (!this.response) {
      throw new Error('Response is not available on the current HttpContext')
    }

    return this.response
  }
}
