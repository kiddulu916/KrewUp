'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog } from '@/components/ui';
import { Plus, Pencil, Trash2, Undo2, Briefcase, Calendar } from 'lucide-react';
import { deleteExperience } from '../actions/experience-actions';
import { useToast } from '@/components/providers/toast-provider';
import type { ExperienceLabels } from '../constants/experience-labels';
import { format } from 'date-fns';

type Experience = {
  id: string;
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
};

type ExperienceListProps = {
  experiences: Experience[];
  labels: ExperienceLabels;
  isEditMode: boolean;
  userRole: 'worker' | 'employer';
  employerType?: 'contractor' | 'developer' | 'recruiter' | 'homeowner' | null;
};

export function ExperienceList({
  experiences,
  labels,
  isEditMode,
  userRole,
  employerType,
}: ExperienceListProps) {
  const router = useRouter();
  const toast = useToast();
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const experienceToDelete = experiences.find((exp) => exp.id === confirmDeleteId);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const handleAddExperience = () => {
    router.push('/dashboard/profile/experience');
  };

  const handleEditExperience = (id: string) => {
    router.push(`/dashboard/profile/experience/${id}`);
  };

  const handleMarkForDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmMarkForDelete = () => {
    if (confirmDeleteId) {
      setPendingDeletes((prev) => new Set(prev).add(confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  const handleUndoDelete = (id: string) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingDeletes.size === 0) return;

    setIsSaving(true);
    const deleteIds = Array.from(pendingDeletes);
    let successCount = 0;
    let errorCount = 0;

    for (const id of deleteIds) {
      try {
        const result = await deleteExperience(id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setIsSaving(false);
    setPendingDeletes(new Set());

    if (errorCount === 0) {
      toast.success(
        successCount === 1
          ? 'Experience deleted successfully'
          : `${successCount} experiences deleted successfully`
      );
    } else if (successCount === 0) {
      toast.error('Failed to delete experiences');
    } else {
      toast.warning(`${successCount} deleted, ${errorCount} failed`);
    }

    router.refresh();
  };

  const hasPendingDeletes = pendingDeletes.size > 0;
  const visibleExperiences = experiences.filter(
    (exp) => isEditMode || !pendingDeletes.has(exp.id)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {labels.tabTitle} ({experiences.length - pendingDeletes.size})
        </h3>
        {isEditMode && (
          <Button
            onClick={handleAddExperience}
            variant="primary"
            size="sm"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {labels.addButton}
          </Button>
        )}
      </div>

      {/* Empty State */}
      {visibleExperiences.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
          <Briefcase className="h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">{labels.emptyState}</p>
          {isEditMode && (
            <Button
              onClick={handleAddExperience}
              variant="outline"
              size="sm"
              className="mt-4 gap-1"
            >
              <Plus className="h-4 w-4" />
              {labels.addButton}
            </Button>
          )}
        </div>
      )}

      {/* Experience Cards */}
      {visibleExperiences.length > 0 && (
        <div className="space-y-4">
          {visibleExperiences.map((experience) => {
            const isPendingDelete = pendingDeletes.has(experience.id);

            return (
              <div
                key={experience.id}
                className={`group relative rounded-lg border bg-white p-4 transition-all ${
                  isPendingDelete
                    ? 'border-red-200 bg-red-50 opacity-60'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isPendingDelete
                          ? 'bg-gray-300'
                          : 'bg-gradient-to-br from-krewup-blue to-krewup-light-blue'
                      }`}
                    >
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-semibold ${
                        isPendingDelete
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {experience.job_title}
                    </h4>
                    <p
                      className={`text-sm ${
                        isPendingDelete
                          ? 'text-gray-400 line-through'
                          : 'text-gray-700'
                      }`}
                    >
                      {experience.company}
                    </p>

                    <div
                      className={`mt-1 flex items-center gap-1.5 text-sm ${
                        isPendingDelete ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {formatDate(experience.start_date)} -{' '}
                        {experience.end_date
                          ? formatDate(experience.end_date)
                          : 'Present'}
                      </span>
                    </div>

                    {experience.description && !isPendingDelete && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {experience.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {isEditMode && (
                    <div className="flex-shrink-0">
                      {isPendingDelete ? (
                        <Button
                          onClick={() => handleUndoDelete(experience.id)}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                        >
                          <Undo2 className="h-4 w-4" />
                          Undo
                        </Button>
                      ) : (
                        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            onClick={() => handleEditExperience(experience.id)}
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            aria-label={`Edit ${experience.job_title}`}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleMarkForDelete(experience.id)}
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Delete ${experience.job_title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Changes Button */}
      {hasPendingDeletes && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            {pendingDeletes.size === 1
              ? '1 experience marked for deletion'
              : `${pendingDeletes.size} experiences marked for deletion`}
          </p>
          <Button
            onClick={handleSaveChanges}
            variant="danger"
            size="sm"
            isLoading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmMarkForDelete}
        title={`Delete ${labels.jobTitle}?`}
        message={
          experienceToDelete
            ? `Are you sure you want to delete "${experienceToDelete.job_title}" at ${experienceToDelete.company}? This will be removed when you save changes.`
            : 'Are you sure you want to delete this experience?'
        }
        confirmText="Mark for Deletion"
        cancelText="Cancel"
      />
    </div>
  );
}
