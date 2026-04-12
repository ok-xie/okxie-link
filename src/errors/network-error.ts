export class NetworkError extends Error {
  name: string
  requestUrl: string
  cause: Error

  constructor(message: string, requestUrl: string, cause: Error) {
    super(message)
    this.name = 'NetworkError'
    this.requestUrl = requestUrl
    this.cause = cause
  }
}
