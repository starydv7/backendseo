import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PublicCreateCommentDto } from '../dto/comment/public-create-comment.dto';
import { PostStatus } from '../enums/post-status.enum';
import { BlogPostsService } from '../services/blog-posts.service';
import { CommentsService } from '../services/comments.service';

/**
 * Public read-only (+ comment submit) endpoints for SEO / marketing websites.
 * Only returns published posts and approved comments.
 */
@Controller('public')
export class PublicBlogController {
  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly commentsService: CommentsService,
  ) {}

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

  /** Single published post by slug (SEO-friendly URL) — full package */
  @Get('posts/slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.fullPost(slug);
  }

  /** Approved comments for a published post (by slug or id) */
  @Get('posts/:slugOrId/comments')
  async comments(@Param('slugOrId') slugOrId: string) {
    const post = await this.requirePublished(slugOrId);
    const comments = await this.commentsService.findByPost(post.id, true);
    return {
      postId: post.id,
      slug: post.slug,
      commentCount: comments.length,
      comments: this.nestComments(comments),
    };
  }

  /**
   * Visitors can submit a comment from any SEO site.
   * Comments go live immediately (no admin approval required).
   */
  @Post('posts/:slugOrId/comments')
  async submitComment(
    @Param('slugOrId') slugOrId: string,
    @Body() dto: PublicCreateCommentDto,
  ) {
    const post = await this.requirePublished(slugOrId);
    const comment = await this.commentsService.create(post.id, {
      ...dto,
      isApproved: true,
    });
    return {
      message: 'Comment posted',
      comment: {
        id: comment.id,
        authorName: comment.authorName,
        content: comment.content,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        isApproved: comment.isApproved,
      },
    };
  }

  /**
   * Full post package by id or slug:
   * post + author + categories + tags + relatedPosts + approved comments + commentCount
   */
  @Get('posts/:slugOrId')
  bySlugOrId(@Param('slugOrId') slugOrId: string) {
    return this.fullPost(slugOrId);
  }

  private async fullPost(slugOrId: string) {
    const post = await this.requirePublished(slugOrId);
    const approved = (post.comments ?? [])
      .filter((c: { isApproved: boolean }) => c.isApproved)
      .sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const { comments: _raw, ...rest } = post;

    return {
      ...rest,
      commentCount: approved.length,
      comments: this.nestComments(approved),
      shareUrl: `/public/posts/slug/${post.slug}`,
    };
  }

  private async requirePublished(slugOrId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );
    const post = isUuid
      ? await this.blogPostsService.findOne(slugOrId)
      : await this.blogPostsService.findBySlug(slugOrId);

    if (post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException(`Published post not found`);
    }
    return post;
  }

  /** Public-safe comment shape (no email) + nested replies */
  private nestComments(comments: any[]) {
    const map = new Map<string, any>();
    for (const c of comments) {
      map.set(c.id, {
        id: c.id,
        authorName: c.authorName,
        content: c.content,
        parentId: c.parentId ?? null,
        createdAt: c.createdAt,
        replies: [] as any[],
      });
    }
    const roots: any[] = [];
    for (const c of comments) {
      const node = map.get(c.id);
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }
}
