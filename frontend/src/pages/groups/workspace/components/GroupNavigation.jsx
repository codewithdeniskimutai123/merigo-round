function GroupNavigation({
  visibleSections,
  activeSection,
  setActiveSection,
}) {
  return (
    <nav
      aria-label="Group sections"
      className="flex gap-2 overflow-x-auto border-b border-border pb-2"
    >
      {visibleSections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => setActiveSection(section.id)}
          aria-current={
            activeSection === section.id ? 'page' : undefined
          }
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            activeSection === section.id
              ? 'bg-[#452044] text-white'
              : 'text-text-muted hover:bg-surface-secondary hover:text-text'
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>
  )
}

export default GroupNavigation