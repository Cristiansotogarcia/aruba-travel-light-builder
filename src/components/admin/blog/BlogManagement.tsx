import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { BlogBloggersTab } from './BlogBloggersTab';
import { BlogPostEditor } from './BlogPostEditor';
import { BlogPostsList } from './BlogPostsList';

/** Admin "Blog" section: all posts (any author) plus blogger management. */
export const BlogManagement = () => {
  const { user } = useAuth();
  const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <BlogPostEditor
        postId={editingPostId}
        mode="admin"
        selfAuthorId={user?.id ?? ''}
        onClose={() => setIsEditing(false)}
        onSaved={(id) => setEditingPostId(id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
          <Newspaper className="h-7 w-7" />
          Blog
        </h1>
        <p className="mt-1 text-muted-foreground">Manage every post and everyone allowed to write one.</p>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="bloggers">Bloggers</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="pt-4">
          <BlogPostsList
            scope="admin"
            onEdit={(postId) => {
              setEditingPostId(postId);
              setIsEditing(true);
            }}
          />
        </TabsContent>
        <TabsContent value="bloggers" className="pt-4">
          <BlogBloggersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogManagement;
