import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownRenderer } from '@/components/common/markdown-renderer';

export default function TermsPage() {
  // Read the markdown file from the public directory
  const filePath = join(process.cwd(), 'public', 'terms.md');
  const markdownContent = readFileSync(filePath, 'utf-8');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <MarkdownRenderer content={markdownContent} />
      </div>
    </div>
  );
}
