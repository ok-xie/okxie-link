export type FormDataPrimitive = string | number | boolean | bigint | Date
export type FormDataEntryInput = FormDataPrimitive | Blob | null | undefined
export type FormDataValue = FormDataEntryInput | readonly FormDataEntryInput[]

export interface UploadFileDescriptor {
  file: Blob
  filename?: string
}

export type UploadFile = Blob | UploadFileDescriptor
export type UploadData = Record<string, FormDataValue>

export interface UploadRequestConfig extends Omit<RequestInit, 'body' | 'method'> {
  baseUrl?: string
  query?: import('./http.js').QueryRecord
  timeout?: number
  data?: UploadData
  file?: UploadFile
  files?: readonly UploadFile[]
  fileFieldName?: string
  formData?: FormData
}
