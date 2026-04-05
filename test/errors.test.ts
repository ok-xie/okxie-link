import { describe, expect, it } from 'vitest'
import { AbortError, HttpError, NetworkError, TimeoutError } from '../src/index.js'
describe('HttpError', () => {
  it('should keep message status and requestUrl', () => {
    const error = new HttpError(
      'HTTP 404 Not Found - https://api.example.com/users/1',
      404,
      'https://api.example.com/users/1',
    )

    expect(error.message).toBe('HTTP 404 Not Found - https://api.example.com/users/1')
    expect(error.status).toBe(404)
    expect(error.requestUrl).toBe('https://api.example.com/users/1')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(HttpError)
  })
})

describe('NetworkError', () => {
  it('should keep message requestUrl and cause', () => {
    const cause = new Error('network failed')
    const error = new NetworkError(
      'Network request failed - https://api.example.com/users',
      'https://api.example.com/users',
      cause,
    )

    expect(error.message).toBe('Network request failed - https://api.example.com/users')
    expect(error.requestUrl).toBe('https://api.example.com/users')
    expect(error.cause).toBe(cause)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NetworkError)
  })
})

describe('TimeoutError', () => {
  it('should keep message requestUrl and cause', () => {
    const cause = new Error('The operation was aborted')
    cause.name = 'AbortError'

    const error = new TimeoutError(
      'Request timed out - https://api.example.com/users',
      'https://api.example.com/users',
      cause,
    )

    expect(error.message).toBe('Request timed out - https://api.example.com/users')
    expect(error.requestUrl).toBe('https://api.example.com/users')
    expect(error.cause).toBe(cause)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(TimeoutError)
  })
})

describe('AbortError', () => {
  it('should keep message requestUrl and cause', () => {
    const cause = new Error('The operation was aborted')
    cause.name = 'AbortError'

    const error = new AbortError(
      'Request was aborted - https://api.example.com/users',
      'https://api.example.com/users',
      cause,
    )

    expect(error.message).toBe('Request was aborted - https://api.example.com/users')
    expect(error.requestUrl).toBe('https://api.example.com/users')
    expect(error.cause).toBe(cause)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AbortError)
  })
})
