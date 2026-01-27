"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_8px_hsl(84_76%_55%_/_0.5)] data-[state=unchecked]:bg-white/5 dark:data-[state=unchecked]:bg-white/5 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-white/30 dark:border-white/30 shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white dark:bg-white pointer-events-none block size-3.5 rounded-full ring-0 transition-all data-[state=checked]:translate-x-[calc(100%+2px)] data-[state=unchecked]:translate-x-[2px] shadow-md data-[state=checked]:shadow-[0_0_6px_hsl(84_76%_55%_/_0.6)] data-[state=checked]:ring-2 data-[state=checked]:ring-primary/40"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
