import React, { Suspense } from 'react';

const ReactQuill = React.lazy(() => import('react-quill'));

const DynamicEditor = (props) => {
  return (
    <Suspense fallback={<div>Loading Editor...</div>}>
      <ReactQuill {...props} />
    </Suspense>
  );
};

export default DynamicEditor;