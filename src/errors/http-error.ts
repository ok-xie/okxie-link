export class HttpError extends Error {
  name: string
  status: number
  requestUrl: string

  constructor(message: string, status: number, requestUrl: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.requestUrl = requestUrl
  }
}
