import React, { Suspense } from 'react';

// Import the secure markdown editor (replaces vulnerable react-quill)
const MDEditor = React.lazy(() => import('@uiw/react-md-editor'));

interface DynamicEditorProps {
  value?: string;
  onChange?: (value?: string) => void;
  className?: string;
  [key: string]: unknown; // Allow additional props
}

const DynamicEditor: React.FC<DynamicEditorProps> = ({ value, onChange, className, ...props }) => {
  return (
    <Suspense fallback={<div>Loading Editor...</div>}>
      <div data-color-mode="light" className={className}>
        <MDEditor
          value={value}
          onChange={onChange}
          preview="edit" // Can be 'edit', 'live', or 'preview'
          height={400}
          // Remove React Quill specific props, keep MD Editor compatible ones
          {...props}
        />
      </div>
    </Suspense>
  );
};

export default DynamicEditor;
