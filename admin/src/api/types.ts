export type PostStatus = 'draft' | 'scheduled' | 'published';

export interface Author {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: PostStatus;
  publishDate: string | null;
  featuredImage: string | null;
  socialSharingImage: string | null;
  estimatedReadingTime: number;
  metaKeywords: string[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  authorId: string | null;
  author?: Author | null;
  categories?: Category[];
  tags?: Tag[];
  relatedPosts?: BlogPost[];
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  isApproved: boolean;
  postId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPosts {
  data: BlogPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateAuthorInput {
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface CreateTagInput {
  name: string;
  slug?: string;
}

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  status?: PostStatus;
  publishDate?: string;
  featuredImage?: string;
  socialSharingImage?: string;
  authorId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  relatedPostIds?: string[];
  metaKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface CreateCommentInput {
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: string;
  isApproved?: boolean;
}
