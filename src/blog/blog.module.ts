import { Module } from '@nestjs/common';
import { AuthorsController } from './controllers/authors.controller';
import { BlogPostsController } from './controllers/blog-posts.controller';
import { CategoriesController } from './controllers/categories.controller';
import { CommentsController } from './controllers/comments.controller';
import { PublicBlogController } from './controllers/public-blog.controller';
import { TagsController } from './controllers/tags.controller';
import { AuthorsService } from './services/authors.service';
import { BlogPostsService } from './services/blog-posts.service';
import { CategoriesService } from './services/categories.service';
import { CommentsService } from './services/comments.service';
import { TagsService } from './services/tags.service';

@Module({
  controllers: [
    AuthorsController,
    CategoriesController,
    TagsController,
    BlogPostsController,
    CommentsController,
    PublicBlogController,
  ],
  providers: [
    AuthorsService,
    CategoriesService,
    TagsService,
    BlogPostsService,
    CommentsService,
  ],
  exports: [
    AuthorsService,
    CategoriesService,
    TagsService,
    BlogPostsService,
    CommentsService,
  ],
})
export class BlogModule {}
