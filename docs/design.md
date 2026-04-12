# okxie-link 设计文档

## 1. 产品目标

`okxie-link` 要做的不是“再封装一层 `fetch`”，而是一个可长期演进的 HTTP 客户端内核。

目标产品形态：

- 对普通用户来说，它是一个调用简单、类型清晰、支持上传的 HTTP 客户端
- 对高级用户来说，它是一个可扩展的 middleware 驱动请求管线
- 对未来演进来说，它支持替换底层 transport，而不是把实现写死在 `fetch`

换句话说，`okxie-link` 要同时满足两类需求：

1. 简单请求足够简单
2. 复杂场景有稳定扩展点

## 2. 用户视角

从用户视角看，这个产品应该提供三层能力。

### 2.1 基础请求层

用户可以直接拿原始响应：

```ts
const response = await client.get('/users/1')
```

### 2.2 JSON 响应层

用户可以直接拿解析后的 JSON：

```ts
const payload = await client.getJson<UserResponse>('/users/1')
```

### 2.3 业务数据层

用户可以直接拿 middleware 处理后的业务 `data`：

```ts
const user = await client.getData<User>('/users/1')
```

这意味着 `okxie-link` 不是单一返回模型，而是：

- `Response`
- parsed JSON
- business data

三层并存。

## 3. 架构目标

为了支撑上面的产品形态，架构上需要满足这些目标：

- `core` 保持最小内核，不被业务协议污染
- middleware 作为主扩展模型
- transport 独立抽象，允许 `fetch` 和 `xhr` 并存
- 上传作为高频通用能力保留在内核
- 高级上传能力不写死在 `core`
- 简单 API 和扩展 API 分层清晰

## 4. 架构总览

整体结构如下：

```text
User API
  |-- request() / get()
  |-- requestJson() / getJson()
  |-- requestData() / getData()
  v
HttpClient
  |-- config merge
  |-- middleware registration
  |-- transport selection
  v
Middleware Pipeline
  |-- auth
  |-- biz
  |-- retry
  |-- logger
  v
HttpContext
  |-- request
  |-- response
  |-- error
  |-- data
  |-- state
  |-- json()/text() cache
  v
Transport
  |-- fetch transport
  |-- xhr transport
  v
Network
```

也可以理解为：

```text
调用层 -> Client 层 -> Pipeline 层 -> Context 层 -> Transport 层 -> 网络层
```

## 5. 分层说明

建议采用下面的目录分层：

```text
src/
  core/
  client/
  context/
  pipeline/
  transport/
  helpers/
  middlewares/
  errors/
  types/
```

### 5.1 `core`

`core` 只保留最小内核能力：

- 请求配置模型
- middleware 执行模型
- `HttpClient`
- `HttpContext`
- transport 抽象
- 错误模型
- 基础 query / headers / body / timeout 处理

不放进 `core` 的内容：

- 业务码协议
- 登录态刷新策略
- 重试策略实现
- 上传进度实现
- 分片上传
- 断点续传

原则：

- `core` 只解决“通用请求执行”问题
- 不解决“具体项目业务协议”问题

### 5.2 `client`

负责用户直接调用的 API。

职责：

- 持有默认配置
- 持有 transport
- 注册 middleware
- 暴露：
  - `request`
  - `requestJson`
  - `requestData`
  - 各种快捷方法

### 5.3 `pipeline`

负责 middleware 执行链。

职责：

- 组合 middleware
- 保障 onion 执行顺序
- 限制 `next()` 只能调用一次
- 把 transport 挂到链尾

### 5.4 `context`

负责请求生命周期上下文。

`HttpContext` 至少包含：

- `request`
- `response`
- `error`
- `data`
- `state`

并提供：

- `json()`
- `text()`
- `setResponse()`
- `setJson()`
- `throw()`

### 5.5 `transport`

负责真正发请求。

transport 必须抽象出来，因为：

- `fetch` 和 `xhr` 的能力边界不同
- 一些 `xhr` 能实现的功能，`fetch` 做不到
- 长期看不能把内核锁死在单一实现上

建议接口：

```ts
interface HttpTransport {
  request(config: ResolvedRequestConfig): Promise<Response>
  capabilities?: TransportCapabilities
}
```

能力声明：

```ts
interface TransportCapabilities {
  uploadProgress: boolean
  downloadProgress: boolean
  streamingRequestBody: boolean
}
```

建议至少支持两个方向：

- `fetchTransport`
- `xhrTransport`

### 5.6 `helpers`

负责通用工具：

- query 拼接
- headers 合并
- body 构建
- timeout/signal 处理
- `toFormData`

这里的规则是：

- 只放通用工具
- 不放业务协议逻辑

### 5.7 `middlewares`

负责官方 middleware。

建议未来放：

- `biz`
- `auth`
- `retry`
- `logger`

首版建议只实现：

- `biz`

### 5.8 `errors`

负责结构化错误：

- `HttpError`
- `NetworkError`
- `TimeoutError`
- `AbortError`
- `BizError`

## 6. 主扩展模型

`okxie-link` 的主扩展模型是 middleware，不再以 interceptor 或旧插件模型为主。

定义：

```ts
type Next = () => Promise<void>

type HttpMiddleware = (ctx: HttpContext, next: Next) => Promise<void>
```

官方插件只是 middleware 工厂：

```ts
client.use(createBizMiddleware(...))
client.use(createAuthMiddleware(...))
```

这样设计的原因：

- middleware 能表达请求前、响应后、错误处理、短路
- middleware 能决定是否继续调用后续链路
- middleware 更适合统一处理业务异常
- middleware 更容易在多个扩展之间共享状态

## 7. 对外 API 设计

### 7.1 对普通用户

不把 `ctx` 作为普通用户的主调用方式。

普通用户应该优先使用结果导向 API：

```ts
const res = await client.get('/users/1')
const json = await client.getJson<UserResponse>('/users/1')
const user = await client.getData<User>('/users/1')
```

原因：

- 客户端用户主要目标是“拿结果”
- `ctx` 风格更适合 middleware 和高级扩展
- 如果主 API 过于上下文化，简单请求会变重

### 7.2 三层返回模型

建议保留三层：

1. `request()` -> `Response`
2. `requestJson<T>()` -> 解析后的 JSON
3. `requestData<T>()` -> middleware 解包后的 `data`

快捷方法同理：

- `get/post/put/patch/delete`
- `getJson/postJson/...`
- `getData/postData/...`

### 7.3 `HttpClient` 草案

```ts
class HttpClient {
  constructor(config: ClientConfig)

  use(middleware: HttpMiddleware): () => void

  request(config: RequestConfig): Promise<Response>
  requestJson<T>(config: RequestConfig): Promise<T | undefined>
  requestData<T>(config: RequestConfig): Promise<T | undefined>

  get(url: string, config?: GetRequestConfig): Promise<Response>
  post(url: string, config?: PostRequestConfig): Promise<Response>
  put(url: string, config?: PutRequestConfig): Promise<Response>
  patch(url: string, config?: PatchRequestConfig): Promise<Response>
  delete(url: string, config?: DeleteRequestConfig): Promise<Response>
  head(url: string, config?: HeadRequestConfig): Promise<Response>
  options(url: string, config?: OptionsRequestConfig): Promise<Response>

  getJson<T>(url: string, config?: GetRequestConfig): Promise<T | undefined>
  postJson<T>(url: string, config?: PostRequestConfig): Promise<T | undefined>
  putJson<T>(url: string, config?: PutRequestConfig): Promise<T | undefined>
  patchJson<T>(url: string, config?: PatchRequestConfig): Promise<T | undefined>
  deleteJson<T>(url: string, config?: DeleteRequestConfig): Promise<T | undefined>

  getData<T>(url: string, config?: GetRequestConfig): Promise<T | undefined>
  postData<T>(url: string, config?: PostRequestConfig): Promise<T | undefined>
  putData<T>(url: string, config?: PutRequestConfig): Promise<T | undefined>
  patchData<T>(url: string, config?: PatchRequestConfig): Promise<T | undefined>
  deleteData<T>(url: string, config?: DeleteRequestConfig): Promise<T | undefined>
}
```

## 8. `HttpContext` 设计

### 8.1 结构

```ts
interface HttpContext<TData = unknown, TJson = unknown> {
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
```

### 8.2 规则

- `json()` 必须缓存结果，避免 body 被重复消费
- `text()` 必须缓存结果
- `state` 用于 middleware 间共享状态
- `data` 用于业务解包后的结果
- `setJson()` 用于直接覆盖响应 JSON
- `throw()` 用于进入统一错误流

## 9. middleware 语义

### 9.1 onion 模型

```text
middleware A before
  middleware B before
    transport
  middleware B after
middleware A after
```

### 9.2 `next()` 规则

- 每个 middleware 最多调用一次 `next()`
- middleware 可以不调用 `next()`，用于短路、mock、fallback
- middleware 可用 `try/catch await next()` 做统一错误处理

### 9.3 适合 middleware 的能力

- 业务码校验
- token 注入
- 日志
- 重试
- mock
- 统一错误处理

## 10. 上传能力如何放置

### 10.1 放进 `core` 的部分

这些属于通用基础能力，可以进内核：

- `toFormData`
- body 对 `FormData` / `Blob` / `File` 的识别
- `upload()`
- `uploadJson()`
- 未来可考虑 `uploadData()`

原因：

- 使用频率高
- 语义通用
- 不依赖特定业务协议

### 10.2 不放进 `core` 的部分

这些不要进内核：

- 上传进度回调
- 分片上传
- 断点续传
- 并发上传调度

原因：

- 强依赖 transport 能力
- 会让 `core` 变重
- 不同项目需求差异大

### 10.3 结论

上传分两层：

- `core` 提供基础上传能力
- transport 扩展层或 middleware 层提供高级上传能力

## 11. transport 设计

### 11.1 为什么一定要抽象

因为：

- `fetch` 和 `xhr` 能力边界不同
- 某些高级能力只有 `xhr` 支持
- 用户不一定永远只想用 `fetch`

### 11.2 建议接口

```ts
interface HttpTransport {
  request(config: ResolvedRequestConfig): Promise<Response>
  capabilities?: TransportCapabilities
}
```

### 11.3 `fetchTransport`

负责：

- 现代浏览器和标准环境的默认请求实现
- 标准 JSON / FormData / Blob 请求
- timeout / abort 支持

不主打：

- 上传进度

### 11.4 `xhrTransport`

负责：

- 支持上传进度
- 支持一些 `fetch` 不好表达的场景

### 11.5 设计结论

`HttpClient` 不继承 transport，只组合 transport。

```ts
const client = new HttpClient({
  baseUrl: '/api',
  transport: createFetchTransport(),
})
```

未来如果用户要上传进度：

```ts
const client = new HttpClient({
  baseUrl: '/api',
  transport: createXhrTransport(),
})
```

## 12. 错误模型

保留并继续使用：

- `HttpError`
- `NetworkError`
- `TimeoutError`
- `AbortError`
- `BizError`

分层：

### 12.1 transport 层错误

- 网络失败
- HTTP 非 2xx
- 超时
- 取消

### 12.2 middleware 层错误

- 业务码失败
- 协议校验失败
- middleware 主动短路时抛出的错误

## 13. 首版官方 middleware

首版只建议实现一个：

### `createBizMiddleware`

职责：

- 校验业务响应是否成功
- 失败时抛 `BizError`
- 成功时将 `payload.data` 写入 `ctx.data`

这一个 middleware 足够验证：

- middleware 模型是否顺手
- `requestData()` 是否合理
- 错误流是否闭环

## 14. 目录建议

建议目录：

```text
src/
  client/
    http-client.ts
  context/
    http-context.ts
  pipeline/
    compose.ts
  transport/
    fetch-transport.ts
    xhr-transport.ts
  middlewares/
    biz.ts
  errors/
    http-error.ts
    network-error.ts
    timeout-error.ts
    abort-error.ts
    biz-error.ts
  helpers/
    body.ts
    form-data.ts
    headers.ts
    query.ts
    request-config.ts
  types/
    http.ts
    middleware.ts
    transport.ts
    upload.ts
  index.ts
```

## 15. 当前结论

最终设计方向：

- `core` 保持最小内核
- 对外主 API 保持结果导向
- middleware 作为主扩展模型
- transport 作为独立抽象层
- 上传基础能力保留在 `core`
- 高级上传能力和 transport 强绑定，不塞进 `core`

这套设计比当前实现更适合长期维护，也更适合后续发展官方和第三方扩展。
