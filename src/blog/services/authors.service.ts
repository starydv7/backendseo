import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateAuthorDto } from '../dto/author/create-author.dto';
import { UpdateAuthorDto } from '../dto/author/update-author.dto';

@Injectable()
export class AuthorsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateAuthorDto) {
    const { data, error } = await this.supabase
      .from('authors')
      .insert(dto)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Author with this email already exists');
      }
      throw error;
    }
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('authors')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('authors')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Author ${id} not found`);
    return data;
  }

  async update(id: string, dto: UpdateAuthorDto) {
    await this.findOne(id);
    const { data, error } = await this.supabase
      .from('authors')
      .update({ ...dto, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Author with this email already exists');
      }
      throw error;
    }
    return data;
  }

  async remove(id: string) {
    await this.findOne(id);
    const { error } = await this.supabase.from('authors').delete().eq('id', id);
    if (error) throw error;
  }
}
