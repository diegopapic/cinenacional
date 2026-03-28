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

  return (
    <div data-color-mode="light" className={readOnly ? 'opacity-60 pointer-events-none' : ''}>
      <MDEditor
        value={field.value ?? ''}
        onChange={readOnly ? undefined : (val) => field.onChange(val ?? '')}
        preview="edit"
        hideToolbar={readOnly}
        height={height}
        visibleDragbar={false}
        enableScroll
      />
    </div>
  )
}
