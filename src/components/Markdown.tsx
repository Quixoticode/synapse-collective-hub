import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Unified markdown renderer for xSyna Central.
 * Renders GFM (tables, task lists, strikethrough, autolinks) with
 * theme-aware typography. Use for user-authored text everywhere.
 */
export function Markdown({ children, className = "" }: { children: string | null | undefined; className?: string }) {
  const text = (children ?? "").toString();
  if (!text.trim()) return null;
  return (
    <div className={`syn-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _n, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-500/40 hover:decoration-cyan-300" />
          ),
          code: ({ className: cn, children, ...props }) => {
            const isBlock = /language-/.test(cn || "");
            if (isBlock) return <pre className="syn-md-pre"><code className={cn} {...props}>{children}</code></pre>;
            return <code className="syn-md-code" {...props}>{children}</code>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
