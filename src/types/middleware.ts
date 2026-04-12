import type { ClientConfig, ResolvedRequestConfig } from './http.js'

export interface HttpContext<TData = unknown, TJson = unknown> {
  request: ResolvedRequestConfig
  response?: Response
  error?: unknown
  data?: TData
  state: Record<string, unknown>

  json(): Promise<TJson>
  text(): Promise<string>
  setResponse(response: Response): void
  setJson(value: unknown, init?: ResponseInit): void
  throw(error: unknown): never
}

export type Next = () => Promise<void>

export type HttpMiddleware<TData = unknown, TJson = unknown> = (
  ctx: HttpContext<TData, TJson>,
  next: Next,
) => Promise<void>

export interface HttpClientLike {
  readonly config: Readonly<ClientConfig>
  use<TData = unknown, TJson = unknown>(
    middleware: HttpMiddleware<TData, TJson>,
  ): () => void
}
