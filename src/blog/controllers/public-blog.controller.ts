import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { BlogPostsService } from '../services/blog-posts.service';
import { PostStatus } from '../enums/post-status.enum';

/**
 * Public read-only endpoints for SEO / marketing websites.
 * Only returns published posts.
 */
@Controller('public')
export class PublicBlogController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

  /** All published posts for blog listing pages */
  @Get('posts')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.blogPostsService.findAll({
      status: PostStatus.PUBLISHED,
      page,
      limit: limit || '20',
      search,
      categoryId,
      tagId,
    });
  }

  /** Single published post by slug (SEO-friendly URL) */
  @Get('posts/slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    const post = await this.blogPostsService.findBySlug(slug);
    if (post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException(`Published post "${slug}" not found`);
    }
    // Only approved comments for public
    return {
      ...post,
      comments: (post.comments ?? []).filter((c: { isApproved: boolean }) => c.isApproved),
    };
  }

  /** Single published post by id */
  @Get('posts/:id')
  async byId(@Param('id') id: string) {
    const post = await this.blogPostsService.findOne(id);
    if (post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException(`Published post not found`);
    }
    return {
      ...post,
      comments: (post.comments ?? []).filter((c: { isApproved: boolean }) => c.isApproved),
    };
  }
}
