
export default function Card({
  children,
  title,
  description,
  className = '',
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface p-6 text-text shadow-sm ${className}`}
    >
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title && (
            <h2 className="text-lg font-semibold">{title}</h2>
          )}

          {description && (
            <p className="text-sm text-text-muted">{description}</p>
          )}
        </header>
      )}

      {children}
    </section>
  )
}
