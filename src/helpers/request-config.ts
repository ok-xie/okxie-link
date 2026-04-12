import { HTTP_METHOD, type ClientConfig, type RequestConfig, type ResolvedRequestConfig } from '../types/http.js'
import { mergeHeaders } from './headers.js'
import { mergeQuery } from './query.js'

export function resolveRequestConfig(
  clientConfig: ClientConfig,
  requestConfig: RequestConfig,
): ResolvedRequestConfig {
  const { headers: clientHeaders, query: clientQuery, timeout: clientTimeout, ...clientRest } =
    clientConfig
  const { headers: requestHeaders, query: requestQuery, timeout: requestTimeout, ...requestRest } =
    requestConfig

  return {
    ...clientRest,
    ...requestRest,
    baseUrl: requestConfig.baseUrl ?? clientConfig.baseUrl,
    headers: mergeHeaders(clientHeaders, requestHeaders),
    method: requestConfig.method ?? HTTP_METHOD.GET,
    query: mergeQuery(clientQuery, requestQuery),
    timeout: requestTimeout ?? clientTimeout,
    url: requestConfig.url,
  }
}
