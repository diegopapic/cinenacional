import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownContentProps {
  children: string
  className?: string
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <Markdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ children: linkChildren, href, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
