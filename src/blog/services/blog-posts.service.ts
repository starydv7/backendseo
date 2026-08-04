import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateBlogPostDto } from '../dto/post/create-blog-post.dto';
import { QueryBlogPostDto } from '../dto/post/query-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/post/update-blog-post.dto';
import { PostStatus } from '../enums/post-status.enum';
import { estimateReadingTime, slugify } from '../utils/blog.utils';
import { AuthorsService } from './authors.service';
import { CategoriesService } from './categories.service';
import { TagsService } from './tags.service';

const POST_SELECT = `
  *,
  author:authors(*),
  categories:blog_post_categories(category:categories(*)),
  tags:blog_post_tags(tag:tags(*)),
  relatedPosts:blog_post_related!postId(related:blog_posts!relatedPostId(*))
`;

@Injectable()
export class BlogPostsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly authorsService: AuthorsService,
    private readonly categoriesService: CategoriesService,
    private readonly tagsService: TagsService,
  ) {}

  async create(dto: CreateBlogPostDto) {
    const slug = await this.resolveUniqueSlug(dto.slug || slugify(dto.title));
    this.validateStatusAndDate(dto.status, dto.publishDate);

    if (dto.authorId) await this.authorsService.findOne(dto.authorId);
    if (dto.categoryIds?.length) {
      await this.categoriesService.findByIds(dto.categoryIds);
    }
    if (dto.tagIds?.length) await this.tagsService.findByIds(dto.tagIds);
    if (dto.relatedPostIds?.length) {
      await this.assertPostsExist(dto.relatedPostIds);
    }

    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .insert({
        title: dto.title,
        slug,
        excerpt: dto.excerpt ?? null,
        content: dto.content,
        status: dto.status ?? PostStatus.DRAFT,
        publishDate: dto.publishDate ?? null,
        featuredImage: dto.featuredImage ?? null,
        socialSharingImage: dto.socialSharingImage ?? null,
        estimatedReadingTime: estimateReadingTime(dto.content),
        metaKeywords: dto.metaKeywords ?? null,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        authorId: dto.authorId ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    await this.syncRelations(
      post.id,
      dto.categoryIds ?? [],
      dto.tagIds ?? [],
      dto.relatedPostIds ?? [],
    );

    return this.findOne(post.id);
  }

  async findAll(query: QueryBlogPostDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(query.limit || '10', 10) || 10),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let qb = this.supabase
      .from('blog_posts')
      .select(POST_SELECT, { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (query.status) qb = qb.eq('status', query.status);
    if (query.authorId) qb = qb.eq('authorId', query.authorId);
    if (query.search) {
      qb = qb.or(
        `title.ilike.%${query.search}%,excerpt.ilike.%${query.search}%`,
      );
    }

    const { data, error, count } = await qb;
    if (error) throw error;

    let rows = (data ?? []).map((row) => this.normalizePost(row));

    if (query.categoryId) {
      rows = rows.filter((p) =>
        p.categories?.some((c: { id: string }) => c.id === query.categoryId),
      );
    }
    if (query.tagId) {
      rows = rows.filter((p) =>
        p.tags?.some((t: { id: string }) => t.id === query.tagId),
      );
    }

    const total = count ?? rows.length;
    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('blog_posts')
      .select(`${POST_SELECT}, comments:comments(*)`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Blog post ${id} not found`);
    return this.normalizePost(data);
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('blog_posts')
      .select(`${POST_SELECT}, comments:comments(*)`)
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new NotFoundException(`Blog post slug "${slug}" not found`);
    }
    return this.normalizePost(data);
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.findOne(id);
    const nextStatus = dto.status ?? existing.status;
    const nextPublishDate =
      dto.publishDate !== undefined
        ? dto.publishDate
        : existing.publishDate;
    this.validateStatusAndDate(nextStatus, nextPublishDate ?? undefined);

    if (dto.authorId) await this.authorsService.findOne(dto.authorId);
    if (dto.categoryIds) {
      await this.categoriesService.findByIds(dto.categoryIds);
    }
    if (dto.tagIds) await this.tagsService.findByIds(dto.tagIds);
    if (dto.relatedPostIds) {
      if (dto.relatedPostIds.includes(id)) {
        throw new BadRequestException('A post cannot relate to itself');
      }
      await this.assertPostsExist(dto.relatedPostIds);
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.excerpt !== undefined) patch.excerpt = dto.excerpt;
    if (dto.content !== undefined) {
      patch.content = dto.content;
      patch.estimatedReadingTime = estimateReadingTime(dto.content);
    }
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.publishDate !== undefined) patch.publishDate = dto.publishDate;
    if (dto.featuredImage !== undefined) {
      patch.featuredImage = dto.featuredImage;
    }
    if (dto.socialSharingImage !== undefined) {
      patch.socialSharingImage = dto.socialSharingImage;
    }
    if (dto.metaKeywords !== undefined) patch.metaKeywords = dto.metaKeywords;
    if (dto.metaTitle !== undefined) patch.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) {
      patch.metaDescription = dto.metaDescription;
    }
    if (dto.authorId !== undefined) patch.authorId = dto.authorId;

    if (dto.slug !== undefined || dto.title !== undefined) {
      const base = dto.slug || slugify((dto.title as string) ?? existing.title);
      patch.slug =
        base === existing.slug
          ? existing.slug
          : await this.resolveUniqueSlug(base, id);
    }

    const { error } = await this.supabase
      .from('blog_posts')
      .update(patch)
      .eq('id', id);
    if (error) throw error;

    if (
      dto.categoryIds !== undefined ||
      dto.tagIds !== undefined ||
      dto.relatedPostIds !== undefined
    ) {
      await this.syncRelations(
        id,
        dto.categoryIds ??
          existing.categories?.map((c: { id: string }) => c.id) ??
          [],
        dto.tagIds ?? existing.tags?.map((t: { id: string }) => t.id) ?? [],
        dto.relatedPostIds ??
          existing.relatedPosts?.map((p: { id: string }) => p.id) ??
          [],
        {
          replaceCategories: dto.categoryIds !== undefined,
          replaceTags: dto.tagIds !== undefined,
          replaceRelated: dto.relatedPostIds !== undefined,
        },
      );
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const { error } = await this.supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async setFeaturedImage(id: string, path: string) {
    return this.update(id, { featuredImage: path });
  }

  async setSocialSharingImage(id: string, path: string) {
    return this.update(id, { socialSharingImage: path });
  }

  private normalizePost(row: any) {
    return {
      ...row,
      categories: (row.categories ?? [])
        .map((c: any) => c.category ?? c)
        .filter(Boolean),
      tags: (row.tags ?? []).map((t: any) => t.tag ?? t).filter(Boolean),
      relatedPosts: (row.relatedPosts ?? [])
        .map((r: any) => r.related ?? r)
        .filter(Boolean),
    };
  }

  private validateStatusAndDate(
    status?: PostStatus | string,
    publishDate?: string | null,
  ) {
    if (status === PostStatus.SCHEDULED) {
      if (!publishDate) {
        throw new BadRequestException(
          'publishDate is required when status is scheduled',
        );
      }
      const date = new Date(publishDate);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        throw new BadRequestException(
          'publishDate must be a future date for scheduled posts',
        );
      }
    }
  }

  private async resolveUniqueSlug(base: string, excludeId?: string) {
    let slug = base || 'post';
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.id === excludeId) return candidate;
      suffix += 1;
    }
  }

  private async assertPostsExist(ids: string[]) {
    const { data, error } = await this.supabase
      .from('blog_posts')
      .select('id')
      .in('id', ids);
    if (error) throw error;
    if ((data?.length ?? 0) !== ids.length) {
      throw new NotFoundException('One or more related posts not found');
    }
  }

  private async syncRelations(
    postId: string,
    categoryIds: string[],
    tagIds: string[],
    relatedPostIds: string[],
    opts = {
      replaceCategories: true,
      replaceTags: true,
      replaceRelated: true,
    },
  ) {
    if (opts.replaceCategories) {
      await this.supabase
        .from('blog_post_categories')
        .delete()
        .eq('postId', postId);
      if (categoryIds.length) {
        const { error } = await this.supabase
          .from('blog_post_categories')
          .insert(
            categoryIds.map((categoryId) => ({ postId, categoryId })),
          );
        if (error) throw error;
      }
    }
    if (opts.replaceTags) {
      await this.supabase.from('blog_post_tags').delete().eq('postId', postId);
      if (tagIds.length) {
        const { error } = await this.supabase.from('blog_post_tags').insert(
          tagIds.map((tagId) => ({ postId, tagId })),
        );
        if (error) throw error;
      }
    }
    if (opts.replaceRelated) {
      await this.supabase
        .from('blog_post_related')
        .delete()
        .eq('postId', postId);
      if (relatedPostIds.length) {
        const { error } = await this.supabase.from('blog_post_related').insert(
          relatedPostIds.map((relatedPostId) => ({ postId, relatedPostId })),
        );
        if (error) throw error;
      }
    }
  }
}
