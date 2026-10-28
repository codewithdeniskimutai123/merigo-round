
export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
}) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary:
      'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
    secondary:
      'border border-border bg-surface text-text hover:bg-page focus-visible:outline-brand-600',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary}`}
    >
      {children}
    </button>
  )
}
