import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
    }
  }

  return (
    <button className="copy-button" type="button" onClick={copy} aria-label={label}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

export default function MessageContent({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children, ...props }) {
            const code = children?.props?.children;
            const value = Array.isArray(code) ? code.join("") : String(code ?? "");
            const className = children?.props?.className ?? "";
            const language = className.match(/language-(\w+)/)?.[1];
            return (
              <div className="code-block">
                <div className="code-block-header">
                  <span>{language || "Code"}</span>
                  <CopyButton value={value} label="Copy code" />
                </div>
                <pre {...props}>{children}</pre>
              </div>
            );
          },
          code({ children, className, ...props }) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { CopyButton };
