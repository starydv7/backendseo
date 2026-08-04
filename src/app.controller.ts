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
      },
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
