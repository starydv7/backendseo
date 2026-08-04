import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateTagDto } from '../dto/tag/create-tag.dto';
import { UpdateTagDto } from '../dto/tag/update-tag.dto';
import { slugify } from '../utils/blog.utils';

@Injectable()
export class TagsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateTagDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.ensureUniqueSlug(slug);
    const { data, error } = await this.supabase
      .from('tags')
      .insert({ name: dto.name, slug })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Tag ${id} not found`);
    return data;
  }

  async update(id: string, dto: UpdateTagDto) {
    const tag = await this.findOne(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : tag.slug);
    if (slug !== tag.slug) await this.ensureUniqueSlug(slug);
    const { data, error } = await this.supabase
      .from('tags')
      .update({
        name: dto.name ?? tag.name,
        slug,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    await this.findOne(id);
    const { error } = await this.supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  }

  async findByIds(ids: string[]) {
    if (!ids?.length) return [];
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    if ((data?.length ?? 0) !== ids.length) {
      throw new NotFoundException('One or more tags not found');
    }
    return data ?? [];
  }

  private async ensureUniqueSlug(slug: string) {
    const { data, error } = await this.supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      throw new ConflictException(`Tag slug "${slug}" already exists`);
    }
  }
}
