import DynamicEditor from '@/components/common/dynamic/DynamicEditor';
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value?: string) => void
  className?: string
}

// Markdown editor doesn't need toolbar configuration - rich editing is built-in
export const RichTextEditor = ({ value, onChange, className }: RichTextEditorProps) => (
  <DynamicEditor
    value={value}
    onChange={onChange}
    className={cn('min-h-[120px]', className)}
  />
)

export default RichTextEditor
