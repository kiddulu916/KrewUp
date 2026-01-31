import mammoth from 'mammoth';
import { logger } from '@/lib/utils/logger';

export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    logger.error('DOCX parsing error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to extract text from DOCX');
  }
}
