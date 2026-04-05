# okxie-link

A lightweight fetch-based HTTP client.

## Features

- Built on top of native `fetch`
- Supports `query` building
- Supports JSON body serialization
- Supports `FormData`
- Supports request timeout
- Distinguishes HTTP errors, network errors, timeout errors, and abort errors
- Provides `request`, `requestJson`, `getJson`, `postJson`, `putJson`

## Installation

This project is currently under local development.

```bash
pnpm install

## Development

pnpm test
pnpm lint
pnpm build

## Usage

import { HttpClient, HTTP_METHOD } from 'okxie-link'

const http = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
})

const response = await http.request({
  url: '/users',
  method: HTTP_METHOD.GET,
  query: {
    page: 1,
  },
})

### JSON request

const user = await http.getJson<{ id: number; name: string }>('/users/1')

### POST JSON

const created = await http.postJson<{ id: number; name: string }>('/users', {
  body: {
    name: 'Tom',
  },
})

## Error Handling

import {
  HttpError,
  NetworkError,
  TimeoutError,
  AbortError,
} from 'okxie-link'

try {
  await http.getJson('/users/1')
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('request timed out')
  } else if (error instanceof AbortError) {
    console.log('request aborted')
  } else if (error instanceof HttpError) {
    console.log(error.status)
  } else if (error instanceof NetworkError) {
    console.log(error.requestUrl)
  }
}

## License

MIT

```
