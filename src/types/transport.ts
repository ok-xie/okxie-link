import type { ResolvedRequestConfig } from './http.js'

export interface TransportCapabilities {
  uploadProgress: boolean
  downloadProgress: boolean
  streamingRequestBody: boolean
}

export interface HttpTransport {
  readonly capabilities?: TransportCapabilities
  request(config: ResolvedRequestConfig): Promise<Response>
}
