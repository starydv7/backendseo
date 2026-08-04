import { api } from './client';
import type {
  Author,
  BlogPost,
  Category,
  Comment,
  CreateAuthorInput,
  CreateCategoryInput,
  CreateCommentInput,
  CreatePostInput,
  CreateTagInput,
  PaginatedPosts,
  PostStatus,
  Tag,
} from './types';

export const authorsApi = {
  list: () => api.get<Author[]>('/blog/authors'),
  get: (id: string) => api.get<Author>(`/blog/authors/${id}`),
  create: (body: CreateAuthorInput) =>
    api.post<Author>('/blog/authors', body),
  update: (id: string, body: Partial<CreateAuthorInput>) =>
    api.patch<Author>(`/blog/authors/${id}`, body),
  remove: (id: string) => api.delete(`/blog/authors/${id}`),
};

export const categoriesApi = {
  list: () => api.get<Category[]>('/blog/categories'),
  create: (body: CreateCategoryInput) =>
    api.post<Category>('/blog/categories', body),
  update: (id: string, body: Partial<CreateCategoryInput>) =>
    api.patch<Category>(`/blog/categories/${id}`, body),
  remove: (id: string) => api.delete(`/blog/categories/${id}`),
};

export const tagsApi = {
  list: () => api.get<Tag[]>('/blog/tags'),
  create: (body: CreateTagInput) => api.post<Tag>('/blog/tags', body),
  update: (id: string, body: Partial<CreateTagInput>) =>
    api.patch<Tag>(`/blog/tags/${id}`, body),
  remove: (id: string) => api.delete(`/blog/tags/${id}`),
};

export const postsApi = {
  list: (params?: {
    search?: string;
    status?: PostStatus | '';
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get<PaginatedPosts>(`/blog/posts${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<BlogPost>(`/blog/posts/${id}`),
  create: (body: CreatePostInput) => api.post<BlogPost>('/blog/posts', body),
  update: (id: string, body: Partial<CreatePostInput>) =>
    api.patch<BlogPost>(`/blog/posts/${id}`, body),
  remove: (id: string) => api.delete(`/blog/posts/${id}`),
  uploadFeatured: (id: string, file: File) =>
    api.upload<BlogPost>(`/blog/posts/${id}/featured-image`, file),
  uploadSocial: (id: string, file: File) =>
    api.upload<BlogPost>(`/blog/posts/${id}/social-sharing-image`, file),
};

export const commentsApi = {
  listByPost: (postId: string, approvedOnly = false) =>
    api.get<Comment[]>(
      `/blog/posts/${postId}/comments${approvedOnly ? '?approvedOnly=true' : ''}`,
    ),
  create: (postId: string, body: CreateCommentInput) =>
    api.post<Comment>(`/blog/posts/${postId}/comments`, body),
  update: (id: string, body: Partial<CreateCommentInput & { isApproved?: boolean; content?: string }>) =>
    api.patch<Comment>(`/blog/comments/${id}`, body),
  approve: (id: string) => api.patch<Comment>(`/blog/comments/${id}/approve`),
  remove: (id: string) => api.delete(`/blog/comments/${id}`),
};
