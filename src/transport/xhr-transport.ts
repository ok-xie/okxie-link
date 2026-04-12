import type { ResolvedRequestConfig } from '../types/http.js'
import type { HttpTransport, TransportCapabilities } from '../types/transport.js'

export class XhrTransport implements HttpTransport {
  readonly capabilities: TransportCapabilities

  constructor() {
    this.capabilities = {
      uploadProgress: true,
      downloadProgress: true,
      streamingRequestBody: false,
    }
  }

  async request(_config: ResolvedRequestConfig): Promise<Response> {
    throw new Error('XhrTransport.request() is not implemented yet')
  }
}

export function createXhrTransport(): HttpTransport {
  return new XhrTransport()
}
