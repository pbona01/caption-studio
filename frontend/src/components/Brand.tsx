import { Captions } from 'lucide-react'

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center border border-white/15 bg-white text-black">
        <Captions className="size-[18px]" strokeWidth={2.4} />
      </span>
      <span className="text-sm font-semibold tracking-[-0.01em] text-white">
        Caption Studio
      </span>
    </div>
  )
}
