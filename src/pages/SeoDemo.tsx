import { SeoManager } from '@/components/admin/SeoManager';

const SeoDemo = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SEO Manager Demo</h1>
          <p className="text-gray-600">
            This is a demonstration of the enhanced SEO Manager component with all requested features.
          </p>
        </div>
        <SeoManager slug="home" />
      </div>
    </div>
  );
};

export default SeoDemo;
