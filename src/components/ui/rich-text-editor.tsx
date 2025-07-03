import DynamicEditor from '@/components/common/dynamic/DynamicEditor';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
  ],
}

export const RichTextEditor = ({ value, onChange, className }: RichTextEditorProps) => (
  <DynamicEditor theme="snow" value={value} onChange={onChange} modules={modules} className={cn('min-h-[120px]', className)} />
)

export default RichTextEditor
