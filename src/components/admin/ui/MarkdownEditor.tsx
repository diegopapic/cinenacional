'use client'

import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import MDEditor from '@uiw/react-md-editor'

interface MarkdownEditorProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  readOnly?: boolean
  height?: number
}

export function MarkdownEditor<T extends FieldValues>({
  name,
  control,
  readOnly = false,
  height = 200,
}: MarkdownEditorProps<T>) {
  const { field } = useController({ name, control })

  if (readOnly) {
    return (
      <div data-color-mode="light">
        <MDEditor
          value={field.value ?? ''}
          preview="preview"
          hideToolbar
          height={height}
          visibleDragbar={false}
        />
      </div>
    )
  }

  return (
    <div data-color-mode="light">
      <MDEditor
        value={field.value ?? ''}
        onChange={(val) => field.onChange(val ?? '')}
        preview="edit"
        height={height}
        visibleDragbar={false}
        enableScroll
      />
    </div>
  )
}
