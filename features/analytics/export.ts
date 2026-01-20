import type {
  ApplicationWithMetrics,
  PipelineMetrics,
} from '@/features/analytics/actions/candidate-pipeline-actions';
import type { JobAnalytics } from '@/features/jobs/actions/job-analytics-actions';

// * Escapes a single value for safe inclusion in CSV output
const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

// * Converts a 2D array of values into CSV text
const toCsv = (rows: Array<Array<unknown>>): string =>
  rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');

export const applicationsToCsv = (applications: ApplicationWithMetrics[]): string => {
  const headers = [
    'Application ID',
    'Status',
    'Created At',
    'Status Updated At',
    'Hired At',
    'Job Title',
    'Applicant Name',
    'Time In Stage (days)',
  ];

  const dataRows = applications.map((application) => [
    application.id,
    application.status,
    application.created_at,
    application.status_updated_at ?? '',
    application.hired_at ?? '',
    application.job_title,
    application.applicant_name,
    application.time_in_stage_days,
  ]);

  return toCsv([headers, ...dataRows]);
};

export const pipelineMetricsToCsv = (metrics: PipelineMetrics): string => {
  const headers = [
    'Total Applications',
    'Pending',
    'Viewed',
    'Contacted',
    'Hired',
    'Rejected',
    'Overall Conversion Rate (%)',
    'Average Time To Hire (days)',
    'Applied → Viewed Conversion Rate (%)',
    'Viewed → Contacted Conversion Rate (%)',
    'Contacted → Hired Conversion Rate (%)',
  ];

  const dataRow = [
    metrics.totalApplications,
    metrics.pending,
    metrics.viewed,
    metrics.contacted,
    metrics.hired,
    metrics.rejected,
    metrics.conversionRate,
    metrics.averageTimeToHire ?? '',
    metrics.stageConversionRates.pendingToViewed,
    metrics.stageConversionRates.viewedToContacted,
    metrics.stageConversionRates.contactedToHired,
  ];

  return toCsv([headers, dataRow]);
};

export const jobAnalyticsToCsv = (analytics: JobAnalytics): string => {
  const summaryHeaders = [
    'Total Views',
    'Unique Views',
    'Applications',
    'Conversion Rate (%)',
  ];

  const summaryRow = [
    analytics.totalViews,
    analytics.uniqueViews,
    analytics.applicationCount,
    analytics.conversionRate,
  ];

  const byDateHeaders = ['Date', 'Views', 'Unique Views'];

  const byDateRows = analytics.viewsByDate.map((entry) => [
    entry.date,
    entry.views,
    entry.uniqueViews,
  ]);

  const rows: Array<Array<unknown>> = [
    summaryHeaders,
    summaryRow,
    [],
    ['Views By Date'],
    byDateHeaders,
    ...byDateRows,
  ];

  return toCsv(rows);
};

