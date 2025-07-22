import * as React from "react"
import { cn } from "../../utils/cn"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-green-600 text-black hover:bg-green-700",
    secondary: "bg-green-600/20 text-green-600 hover:bg-green-600/30",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "text-green-600 border border-green-600",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }