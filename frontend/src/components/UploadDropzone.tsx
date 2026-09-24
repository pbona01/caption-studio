import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowUpRight, Film, LoaderCircle, Upload } from 'lucide-react'

interface UploadDropzoneProps {
  isUploading: boolean
  onUpload: (file: File) => void
}

const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.m4v']

export function UploadDropzone({ isUploading, onUpload }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const submit = (file?: File) => {
    if (!file || isUploading) return
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!ACCEPTED_EXTENSIONS.includes(extension)) return
    onUpload(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    submit(event.dataTransfer.files[0])
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    submit(event.target.files?.[0])
    event.target.value = ''
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false)
      }}
      onDrop={onDrop}
      className={`group relative overflow-hidden border transition duration-300 ${
        isDragging ? 'border-accent bg-accent/[0.035]' : 'border-white/10 bg-panel'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.m4v,video/mp4,video/quicktime"
        className="sr-only"
        onChange={onChange}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="grid min-h-[340px] place-items-center px-8 py-12 sm:min-h-[410px]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-7 grid size-14 place-items-center border border-white/10 bg-black/30 text-zinc-300 transition group-hover:border-white/20 group-hover:text-white">
            {isUploading ? (
              <LoaderCircle className="size-6 animate-spin" />
            ) : (
              <Upload className="size-6" strokeWidth={1.6} />
            )}
          </div>
          <h2 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-[32px]">
            {isUploading ? 'Reading your video…' : 'Drop your video here'}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-500">
            {isUploading
              ? 'Uploading to the processing engine and inspecting media metadata.'
              : 'Add a short talking-head clip to begin. Your video is uploaded to the configured processing engine.'}
          </p>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="mt-8 inline-flex h-11 items-center gap-2 bg-white px-5 text-sm font-semibold text-black transition hover:bg-accent disabled:cursor-wait disabled:opacity-60"
          >
            {isUploading ? 'Uploading' : 'Choose video'}
            {!isUploading && <ArrowUpRight className="size-4" />}
          </button>
          <div className="mt-9 flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            <Film className="size-3.5" />
            MP4 · MOV · M4V · Up to 5 min
          </div>
        </div>
      </div>
    </div>
  )
}
