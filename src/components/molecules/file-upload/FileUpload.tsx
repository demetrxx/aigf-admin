import type { ChangeEvent, MutableRefObject } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { isApiRequestError } from '@/app/api/apiErrors';
import { markFileUploaded, signUpload } from '@/app/files/filesApi';
import { Badge, Button, Field, Input, Progress, Typography } from '@/atoms';
import type { FileDir, IFile } from '@/common/types';
import { FileStatus } from '@/common/types';

import s from './FileUpload.module.scss';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const EXTENSION_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const;
const ACCEPTED_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_MIME));

type FileUploadStatus =
  | 'idle'
  | 'selected'
  | 'signing'
  | 'uploading'
  | 'finalizing'
  | 'done'
  | 'error';

type FileUploadProps = {
  label?: string;
  hint?: string;
  required?: boolean;
  folder: FileDir;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
  value?: IFile | null;
  onChange?: (file: IFile | null) => void;
  onError?: (message: string) => void;
  name?: string;
  className?: string;
  buttonLabel?: string;
};

function getFileExtension(name: string) {
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function isAcceptedFile(file: File) {
  if (ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }
  const extension = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.has(extension);
}

function resolveMimeType(file: File) {
  if (file.type) {
    return file.type;
  }
  const extension = getFileExtension(file.name);
  return (
    EXTENSION_TO_MIME[extension as keyof typeof EXTENSION_TO_MIME] ??
    'application/octet-stream'
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function resolveErrorMessage(error: unknown) {
  if (isApiRequestError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Upload failed.';
}

function uploadToPresigned(
  presigned: { url: string; fields: Record<string, string> },
  file: File,
  onProgress: (value: number) => void,
  requestRef: MutableRefObject<XMLHttpRequest | null>,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    requestRef.current = xhr;
    xhr.open('POST', presigned.url);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) {
        return;
      }
      const nextValue = Math.round((event.loaded / event.total) * 100);
      onProgress(nextValue);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error('Upload failed.'));
    };
    xhr.onerror = () => reject(new Error('Upload failed.'));
    xhr.onabort = () => reject(new Error('Upload canceled.'));

    const formData = new FormData();
    Object.entries(presigned.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', file);

    xhr.send(formData);
  });
}

export function FileUpload({
  label = 'File',
  required,
  folder,
  accept = DEFAULT_ACCEPT,
  maxSizeMb,
  disabled = false,
  value = null,
  onChange,
  onError,
  name,
  className,
  buttonLabel = 'Choose file',
}: FileUploadProps) {
  const inputId = useId();
  const [status, setStatus] = useState<FileUploadStatus>(
    value?.status === FileStatus.UPLOADED ? 'done' : 'idle',
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<IFile | null>(value);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const uploadRequestRef = useRef<XMLHttpRequest | null>(null);

  const isBusy =
    status === 'signing' || status === 'uploading' || status === 'finalizing';
  const isDisabled = disabled || isBusy;

  useEffect(() => {
    return () => {
      uploadRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setUploadedFile(value ?? null);
    setStatus(value?.status === FileStatus.UPLOADED ? 'done' : 'idle');
    setErrorMessage(null);
    if (!value) {
      setSelectedFile(null);
      setProgress(0);
    }
  }, [value]);

  // const resolvedHint =
  //   hint ??
  //   (maxSizeMb
  //     ? `PNG, JPG, JPEG, WEBP. Up to ${maxSizeMb} MB.`
  //     : 'PNG, JPG, JPEG, WEBP.');

  const fileName =
    selectedFile?.name || uploadedFile?.name || 'No file selected';
  const fileSize = selectedFile ? formatBytes(selectedFile.size) : null;
  const hasFile = Boolean(selectedFile || uploadedFile);
  const showPreview =
    uploadedFile?.status === FileStatus.UPLOADED && Boolean(uploadedFile.url);

  const handleClear = () => {
    if (isDisabled) return;
    setSelectedFile(null);
    setUploadedFile(null);
    setStatus('idle');
    setErrorMessage(null);
    setProgress(0);
    setInputKey((prev) => prev + 1);
    onChange?.(null);
  };

  const handleTriggerClick = () => {
    if (isDisabled) return;
    const element = document.getElementById(inputId);
    if (element instanceof HTMLInputElement) {
      element.click();
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isDisabled) return;

    setInputKey((prev) => prev + 1);
    setErrorMessage(null);
    setSelectedFile(file);
    setProgress(0);
    setStatus('selected');

    if (!isAcceptedFile(file)) {
      const message = 'Only PNG, JPG, JPEG, or WEBP files are allowed.';
      setErrorMessage(message);
      setStatus('error');
      onError?.(message);
      return;
    }

    if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
      const message = `File must be ${maxSizeMb} MB or less.`;
      setErrorMessage(message);
      setStatus('error');
      onError?.(message);
      return;
    }

    try {
      setStatus('signing');
      const mime = resolveMimeType(file);
      const { presigned, file: signedFile } = await signUpload({
        fileName: file.name,
        mime,
        folder,
      });
      setUploadedFile(signedFile);

      setStatus('uploading');
      await uploadToPresigned(presigned, file, setProgress, uploadRequestRef);

      setStatus('finalizing');
      const success = await markFileUploaded(signedFile.id);
      if (!success) {
        throw new Error('Unable to finalize upload.');
      }

      const nextFile = { ...signedFile, status: FileStatus.UPLOADED };
      setUploadedFile(nextFile);
      setStatus('done');
      setProgress(100);
      onChange?.(nextFile);
    } catch (error) {
      const message = resolveErrorMessage(error);
      setErrorMessage(message);
      setStatus('error');
      onError?.(message);
    } finally {
      uploadRequestRef.current = null;
    }
  };

  const statusText =
    status === 'signing'
      ? 'Preparing upload...'
      : status === 'finalizing'
        ? 'Finalizing...'
        : null;

  const uploadText =
    status === 'uploading'
      ? progress > 0
        ? `Uploading ${progress}%`
        : 'Uploading...'
      : null;

  return (
    <Field
      label={label}
      // hint={resolvedHint}
      required={required}
      error={errorMessage ?? undefined}
      labelFor={inputId}
      className={className}
    >
      <div className={s.root}>
        <div className={s.row}>
          <Button
            variant="secondary"
            disabled={isDisabled}
            onClick={handleTriggerClick}
          >
            {buttonLabel}
          </Button>
          <div className={s.info}>
            <Typography
              className={s.name}
              variant="body"
              tone={hasFile ? 'default' : 'muted'}
              truncate
            >
              {fileName}
            </Typography>
            {fileSize ? (
              <Typography className={s.meta} variant="meta" tone="muted">
                {fileSize}
              </Typography>
            ) : null}
          </div>
          {status === 'done' ? <Badge tone="success">Uploaded</Badge> : null}
          {(selectedFile || uploadedFile) && !isBusy ? (
            <Button
              variant="text"
              size="sm"
              onClick={handleClear}
              disabled={isDisabled}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {uploadText ? (
          <div className={s.progressRow}>
            <Progress value={progress} size="sm" />
            <Typography variant="meta" tone="muted">
              {uploadText}
            </Typography>
          </div>
        ) : statusText ? (
          <Typography variant="meta" tone="muted">
            {statusText}
          </Typography>
        ) : null}

        {showPreview && uploadedFile?.url ? (
          <div className={s.previewRow}>
            <img
              className={s.preview}
              src={uploadedFile.url}
              alt={uploadedFile.name}
            />
          </div>
        ) : null}

        <Input
          key={inputKey}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          disabled={isDisabled}
          onChange={handleFileChange}
          wrapperClassName={s.hiddenInputWrapper}
          className={s.hiddenInput}
        />
      </div>
    </Field>
  );
}
