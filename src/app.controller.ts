import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'backendseo',
      status: 'ok',
      message: 'Blog Management API is running',
      docs: {
        authors: '/blog/authors',
        categories: '/blog/categories',
        tags: '/blog/tags',
        posts: '/blog/posts',
        comments: '/blog/posts/:postId/comments',
        public: {
          posts: '/public/posts',
          postFull: '/public/posts/:slugOrId',
          postBySlug: '/public/posts/slug/:slug',
          postComments: '/public/posts/:slugOrId/comments',
          submitComment: 'POST /public/posts/:slugOrId/comments',
        },
      },
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
