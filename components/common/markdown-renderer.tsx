'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const markdownComponents: Components = {
  h1: ({ node, ...props }) => <h1 className="text-4xl font-bold text-krewup-blue mb-4 mt-8" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-krewup-blue mb-3 mt-6" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-krewup-blue mb-2 mt-4" {...props} />,
  h4: ({ node, ...props }) => <h4 className="text-md font-bold text-krewup-blue mb-2 mt-4" {...props} />,
  p: ({ node, ...props }) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-krewup-blue" {...props} />,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}

