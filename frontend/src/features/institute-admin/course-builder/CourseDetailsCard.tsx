// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { type Dispatch, type SetStateAction } from "react";
import PageCard from "@/components/ui/PageCard";
import Dropdown from "@/components/ui/Dropdown";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import ImageUploadField from "@/components/ui/ImageUploadField";
import { toCourseStatus, type CourseStatus } from "./courseBuilderHelpers";

export interface CourseFormState {
  name: string;
  description: string;
  status: CourseStatus;
  useLevels: boolean;
  teachers: string[];
  thumbnailFile: File | null;
  thumbnailPreview: string | null;
}

interface CourseDetailsCardProps {
  form: CourseFormState;
  setForm: Dispatch<SetStateAction<CourseFormState>>;
  isEditMode: boolean;
  creatingCourse: boolean;
  createButtonLabel: string;
  onSubmit: (e: React.SyntheticEvent) => void;
  onCreateNew: () => void;
}

/** Course metadata form: name, status, description, thumbnail, and save actions. */
export default function CourseDetailsCard({
  form,
  setForm,
  isEditMode,
  creatingCourse,
  createButtonLabel,
  onSubmit,
  onCreateNew,
}: CourseDetailsCardProps) {
  return (
    <PageCard title="Course Details">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            id="course-name"
            label="Course Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <div>
            <label
              htmlFor="course-status"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Status
            </label>
            <Dropdown
              value={form.status}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
              ]}
              onChange={(v) =>
                setForm((p) => ({ ...p, status: toCourseStatus(v) }))
              }
            />
          </div>
        </div>

        <Textarea
          id="course-description"
          label="Description"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          className="min-h-[90px]"
        />

        <ImageUploadField
          label="Thumbnail"
          hint="JPG, PNG, WEBP · Max 2 MB · Recommended 1280×720"
          id="course-thumbnail"
          previewUrl={form.thumbnailPreview}
          isNewSelection={!!form.thumbnailFile}
          onSelect={(file, objectUrl) =>
            setForm((p) => ({
              ...p,
              thumbnailFile: file,
              thumbnailPreview: objectUrl,
            }))
          }
          onRemove={() =>
            setForm((p) => ({
              ...p,
              thumbnailFile: null,
              thumbnailPreview: null,
            }))
          }
        />

        <div className="flex justify-end pt-2 gap-3">
          {isEditMode ? (
            <Button type="submit">Update Course Meta</Button>
          ) : (
            <Button
              loading={creatingCourse}
              loadingText="Creating…"
              onClick={onCreateNew}
            >
              {createButtonLabel}
            </Button>
          )}
        </div>
      </form>
    </PageCard>
  );
}
