export type QueryValue = string | number | boolean | null | undefined
export type QueryRecord = Record<string, QueryValue>

export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD]

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  baseUrl?: string
  url: string
  method?: HttpMethod
  query?: QueryRecord
  body?: unknown
  timeout?: number
}

export interface ClientConfig
  extends Omit<RequestConfig, 'baseUrl' | 'url' | 'method' | 'body' | 'signal'> {
  baseUrl: string
}

export interface ResolvedRequestConfig
  extends Omit<RequestConfig, 'baseUrl' | 'headers' | 'query' | 'method'> {
  baseUrl: string
  method: HttpMethod
  headers: Headers
  query: QueryRecord
}

export type GetRequestConfig = Omit<RequestConfig, 'url' | 'method' | 'body'>
export type DeleteRequestConfig = Omit<RequestConfig, 'url' | 'method' | 'body'>
export type PostRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type PutRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type PatchRequestConfig = Omit<RequestConfig, 'url' | 'method'>
export type HeadRequestConfig = Omit<RequestConfig, 'url' | 'method' | 'body'>
export type OptionsRequestConfig = Omit<RequestConfig, 'url' | 'method'>
