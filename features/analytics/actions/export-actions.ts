'use server';

import type { PipelineStage } from '@/features/analytics/actions/candidate-pipeline-actions';
import {
  getCandidatePipelineMetrics,
  getPipelineApplications,
} from '@/features/analytics/actions/candidate-pipeline-actions';
import { getJobAnalytics } from '@/features/jobs/actions/job-analytics-actions';
import {
  applicationsToCsv,
  jobAnalyticsToCsv,
  pipelineMetricsToCsv,
} from '@/features/analytics/export';

export type ExportFormat = 'csv' | 'json';

export type ExportResult = {
  success: boolean;
  error?: string;
  filename?: string;
  mimeType?: string;
  content?: string;
};

const buildFilename = (base: string, extension: string): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${base}-${date}.${extension}`;
};

export const exportPipelineMetrics = async (
  dateRange: '7d' | '30d' | 'all' = 'all',
  format: ExportFormat = 'csv',
): Promise<ExportResult> => {
  const result = await getCandidatePipelineMetrics(dateRange);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error ?? 'Failed to load pipeline metrics',
    };
  }

  if (format === 'json') {
    return {
      success: true,
      filename: buildFilename('pipeline-metrics', 'json'),
      mimeType: 'application/json',
      content: JSON.stringify(result.data),
    };
  }

  return {
    success: true,
    filename: buildFilename('pipeline-metrics', 'csv'),
    mimeType: 'text/csv',
    content: pipelineMetricsToCsv(result.data),
  };
};

export const exportPipelineApplications = async (
  stage: PipelineStage | 'all' = 'all',
  dateRange: '7d' | '30d' | 'all' = 'all',
  format: ExportFormat = 'csv',
): Promise<ExportResult> => {
  const result = await getPipelineApplications(stage, dateRange);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error ?? 'Failed to load pipeline applications',
    };
  }

  if (format === 'json') {
    return {
      success: true,
      filename: buildFilename('pipeline-applications', 'json'),
      mimeType: 'application/json',
      content: JSON.stringify(result.data),
    };
  }

  return {
    success: true,
    filename: buildFilename('pipeline-applications', 'csv'),
    mimeType: 'text/csv',
    content: applicationsToCsv(result.data),
  };
};

export const exportJobAnalytics = async (
  jobId: string,
  dateRange: 'week' | 'month' | 'all' = 'month',
  format: ExportFormat = 'csv',
): Promise<ExportResult> => {
  const result = await getJobAnalytics(jobId, dateRange);

  if (!result.success || !result.analytics) {
    return {
      success: false,
      error: result.error ?? 'Failed to load job analytics',
    };
  }

  if (format === 'json') {
    return {
      success: true,
      filename: buildFilename('job-analytics', 'json'),
      mimeType: 'application/json',
      content: JSON.stringify(result.analytics),
    };
  }

  return {
    success: true,
    filename: buildFilename('job-analytics', 'csv'),
    mimeType: 'text/csv',
    content: jobAnalyticsToCsv(result.analytics),
  };
};

