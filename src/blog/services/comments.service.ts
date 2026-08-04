import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateCommentDto } from '../dto/comment/create-comment.dto';
import { UpdateCommentDto } from '../dto/comment/update-comment.dto';
import { BlogPostsService } from './blog-posts.service';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly blogPostsService: BlogPostsService,
  ) {}

  async create(postId: string, dto: CreateCommentDto) {
    await this.blogPostsService.findOne(postId);

    if (dto.parentId) {
      const { data: parent, error } = await this.supabase
        .from('comments')
        .select('*')
        .eq('id', dto.parentId)
        .maybeSingle();
      if (error) throw error;
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException(
          'parentId must belong to a comment on the same post',
        );
      }
    }

    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        content: dto.content,
        parentId: dto.parentId ?? null,
        postId,
        isApproved: dto.isApproved ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findByPost(postId: string, approvedOnly = false) {
    await this.blogPostsService.findOne(postId);
    let qb = this.supabase
      .from('comments')
      .select('*')
      .eq('postId', postId)
      .order('createdAt', { ascending: false });
    if (approvedOnly) qb = qb.eq('isApproved', true);
    const { data, error } = await qb;
    if (error) throw error;
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Comment ${id} not found`);
    return data;
  }

  async update(id: string, dto: UpdateCommentDto) {
    await this.findOne(id);
    const { data, error } = await this.supabase
      .from('comments')
      .update({ ...dto, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async approve(id: string) {
    return this.update(id, { isApproved: true });
  }

  async remove(id: string) {
    await this.findOne(id);
    const { error } = await this.supabase
      .from('comments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
