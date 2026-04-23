function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function SectionLabel({
  as: Component = 'p',
  className = '',
  children,
  ...props
}) {
  return (
    <Component className={joinClasses('section-label', className)} {...props}>
      {children}
    </Component>
  )
}
