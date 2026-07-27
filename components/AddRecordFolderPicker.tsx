"use client";

import { useRouter } from "next/navigation";
import {
  FolderPickerGrid,
  type FolderPickerGroup,
  type FolderPickerOption,
} from "@/components/FolderPickerGrid";

export function AddRecordFolderPicker({
  groups,
}: {
  groups: FolderPickerGroup[];
}) {
  const router = useRouter();

  function pickFolder(f: FolderPickerOption) {
    router.push(
      `/records/${f.categoryId}/new?subcategory=${encodeURIComponent(f.id)}`
    );
  }

  return (
    <FolderPickerGrid
      groups={groups}
      onPick={pickFolder}
      emptyLabel="You don't have any folders to add records to yet."
    />
  );
}
