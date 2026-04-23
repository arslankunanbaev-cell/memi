function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function PageHeader({
  title,
  subtitle,
  aside,
  titleTag: TitleTag = 'h1',
  brand = false,
  className = '',
  containerClassName = '',
  titleClassName = '',
  subtitleClassName = '',
  bottom,
  style,
  titleStyle,
  subtitleStyle,
}) {
  return (
    <div className={joinClasses('px-4 pt-topbar', className)} style={style}>
      <div className={joinClasses('flex items-start justify-between gap-4', containerClassName)}>
        <div className="min-w-0">
          <TitleTag
            className={joinClasses(brand ? 'type-brand' : 'type-page-title', titleClassName)}
            style={{ color: 'var(--text)', margin: 0, ...titleStyle }}
          >
            {title}
          </TitleTag>

          {subtitle ? (
            <p
              className={joinClasses('font-sans type-topbar-meta', subtitleClassName)}
              style={{ color: 'var(--mid)', margin: '4px 0 0', ...subtitleStyle }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {aside}
      </div>

      {bottom ? <div style={{ marginTop: 14 }}>{bottom}</div> : null}
    </div>
  )
}
