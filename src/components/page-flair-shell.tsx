import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PageFlairShellProps = {
  children: ReactNode
  contentClassName?: string
  mainClassName?: string
}

type PageFlairBackdropProps = {
  className?: string
  topOrbClassName?: string
  bottomOrbClassName?: string
}

const DEFAULT_TOP_ORB_CLASS_NAME = '-top-24 right-0 h-80 w-80 bg-[#86e6d3]/30'
const DEFAULT_BOTTOM_ORB_CLASS_NAME = 'bottom-0 -left-24 h-80 w-80 bg-[#ffab92]/24'

export function PageFlairBackdrop({
  className,
  topOrbClassName = DEFAULT_TOP_ORB_CLASS_NAME,
  bottomOrbClassName = DEFAULT_BOTTOM_ORB_CLASS_NAME,
}: PageFlairBackdropProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden="true">
      <div className={cn('absolute rounded-full blur-3xl', topOrbClassName)} />
      <div className={cn('absolute rounded-full blur-3xl', bottomOrbClassName)} />
    </div>
  )
}

export function PageFlairShell({ children, contentClassName, mainClassName }: PageFlairShellProps) {
  return (
    <main className={cn('relative overflow-hidden', mainClassName)}>
      <PageFlairBackdrop />

      <div className={cn('relative mx-auto w-full px-6 py-10', contentClassName)}>
        {children}
      </div>
    </main>
  )
}
