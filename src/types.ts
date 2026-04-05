export type QueryType = Record<string, string | number | undefined | null>

export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD]

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  url: string
  query?: QueryType
  body?: unknown
  timeout?: number
  method?: HttpMethod
}

export interface ClientConfig {
  baseUrl: string
  timeout?: number
}
export type GetRequestConfig = Omit<RequestConfig, 'url' | 'method' | 'body'>
export type DeleteRequestConfig = Omit<RequestConfig, 'url' | 'method' | 'body'>
export type PostRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type PutRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type PatchRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type HeadRequestConfig = Omit<RequestConfig, 'url' | 'method' | 'body'>
export type OptionsRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type BuildSignalResult = {
  signal?: AbortSignal
  source: 'user' | 'timeout' | 'none'
}
