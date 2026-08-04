import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { slugify } from '../utils/blog.utils';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.ensureUniqueSlug(slug);
    const { data, error } = await this.supabase
      .from('categories')
      .insert({ name: dto.name, slug, description: dto.description ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Category ${id} not found`);
    return data;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : category.slug);
    if (slug !== category.slug) await this.ensureUniqueSlug(slug);
    const { data, error } = await this.supabase
      .from('categories')
      .update({
        name: dto.name ?? category.name,
        slug,
        description:
          dto.description !== undefined ? dto.description : category.description,
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
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async findByIds(ids: string[]) {
    if (!ids?.length) return [];
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    if ((data?.length ?? 0) !== ids.length) {
      throw new NotFoundException('One or more categories not found');
    }
    return data ?? [];
  }

  private async ensureUniqueSlug(slug: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      throw new ConflictException(`Category slug "${slug}" already exists`);
    }
  }
}
