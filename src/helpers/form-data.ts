import type {
  FormDataEntryInput,
  FormDataValue,
  UploadData,
  UploadFile,
} from '../types/upload.js'

export function toFormData(data: UploadData, formData: FormData = new FormData()): FormData {
  for (const [key, value] of Object.entries(data)) {
    appendFormDataValue(formData, key, value)
  }

  return formData
}

export function appendUploadFile(formData: FormData, key: string, file: UploadFile): void {
  if (isUploadFileDescriptor(file)) {
    if (file.filename) {
      formData.append(key, file.file, file.filename)
      return
    }

    formData.append(key, file.file)
    return
  }

  formData.append(key, file)
}

function appendFormDataValue(formData: FormData, key: string, value: FormDataValue): void {
  if (isFormDataArray(value)) {
    for (const item of value) {
      appendFormDataEntry(formData, key, item)
    }
    return
  }

  appendFormDataEntry(formData, key, value)
}

function appendFormDataEntry(formData: FormData, key: string, value: FormDataEntryInput): void {
  if (value == null) {
    return
  }

  if (value instanceof Blob) {
    formData.append(key, value)
    return
  }

  if (value instanceof Date) {
    formData.append(key, value.toISOString())
    return
  }

  formData.append(key, String(value))
}

function isUploadFileDescriptor(value: UploadFile): value is Exclude<UploadFile, Blob> {
  return typeof value === 'object' && value !== null && 'file' in value
}

function isFormDataArray(value: FormDataValue): value is readonly FormDataEntryInput[] {
  return Array.isArray(value)
}
