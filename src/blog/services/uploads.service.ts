import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

const BUCKET = 'blog-images';
const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class UploadsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async uploadImage(file: Express.Multer.File | undefined): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose an image file to upload');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Image must be 5 MB or smaller');
    }
    const ext = MIME_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'Only JPEG, PNG, WEBP, or GIF images are allowed',
      );
    }

    const objectPath = `${uuidv4()}${ext}`;
    await this.ensureBucket();

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);
    return data.publicUrl;
  }

  private async ensureBucket() {
    const { data } = await this.supabase.storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await this.supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new BadRequestException(
        `Could not prepare image storage: ${error.message}`,
      );
    }
  }
}
