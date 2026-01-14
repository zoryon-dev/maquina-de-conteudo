import { cn } from "@/lib/utils"
import { forwardRef, type HTMLAttributes } from "react"

/**
 * Typography component with consistent styling for all text elements.
 *
 * Uses Tailwind CSS classes based on shadcn/ui patterns for:
 * - Semantic HTML elements (h1-h4, p, blockquote, etc.)
 * - CSS variables for theming (text-muted-foreground, text-primary, etc.)
 * - Consistent spacing and sizing
 */

const TypographyRoot = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("typography", className)} {...props} />
)

const H1 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl",
        className
      )}
      {...props}
    />
  )
)
H1.displayName = "Typography.H1"

const H2 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  )
)
H2.displayName = "Typography.H2"

const H3 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  )
)
H3.displayName = "Typography.H3"

const H4 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4
      ref={ref}
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  )
)
H4.displayName = "Typography.H4"

const P = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    />
  )
)
P.displayName = "Typography.P"

const Lead = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-xl text-muted-foreground [&:not(:first-child)]:mt-6",
        className
      )}
      {...props}
    />
  )
)
Lead.displayName = "Typography.Lead"

const Large = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
)
Large.displayName = "Typography.Large"

const Small = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <small
      ref={ref}
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  )
)
Small.displayName = "Typography.Small"

const Muted = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
Muted.displayName = "Typography.Muted"

const InlineCode = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <code
      ref={ref}
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
        className
      )}
      {...props}
    />
  )
)
InlineCode.displayName = "Typography.InlineCode"

const Blockquote = forwardRef<HTMLQuoteElement, HTMLAttributes<HTMLQuoteElement>>(
  ({ className, ...props }, ref) => (
    <blockquote
      ref={ref}
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    />
  )
)
Blockquote.displayName = "Typography.Blockquote"

const List = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  )
)
List.displayName = "Typography.List"

const ListItem = forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
  )
)
ListItem.displayName = "Typography.ListItem"

const Link = forwardRef<HTMLAnchorElement, HTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        "font-medium text-primary underline underline-offset-4",
        className
      )}
      {...props}
    />
  )
)
Link.displayName = "Typography.Link"

/**
 * Typography component with sub-components for consistent text styling.
 *
 * @example
 * ```tsx
 * <Typography.H1>Title</Typography.H1>
 * <Typography.P>Paragraph text</Typography.P>
 * <Typography.Lead>Lead paragraph</Typography.Lead>
 * <Typography.Muted>Muted text</Typography.Muted>
 * <Typography.Blockquote>Quote</Typography.Blockquote>
 * ```
 */
export const Typography = Object.assign(TypographyRoot, {
  H1,
  H2,
  H3,
  H4,
  P,
  Lead,
  Large,
  Small,
  Muted,
  InlineCode,
  Blockquote,
  List,
  ListItem,
  Link,
})
