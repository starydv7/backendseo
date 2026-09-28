import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  BadRequestException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CreateBlogPostDto } from '../dto/post/create-blog-post.dto';
import { QueryBlogPostDto } from '../dto/post/query-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/post/update-blog-post.dto';
import { BlogPostsService } from '../services/blog-posts.service';
import { UploadsService } from '../services/uploads.service';

const imageUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller('blog/posts')
@UseGuards(SupabaseAuthGuard)
export class BlogPostsController {
  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly uploadsService: UploadsService,
  ) {}

  /** Upload an image and return a public URL. Works before the post is saved. */
  @Post('uploads')
  @UseInterceptors(imageUpload)
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.uploadImage(file);
    return { url };
  }

  @Post()
  create(@Body() dto: CreateBlogPostDto) {
    return this.blogPostsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryBlogPostDto) {
    return this.blogPostsService.findAll(query);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogPostsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogPostsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogPostsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogPostsService.remove(id);
  }

  @Post(':id/featured-image')
  @UseInterceptors(imageUpload)
  async uploadFeaturedImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose an image file to upload');
    const url = await this.uploadsService.uploadImage(file);
    return this.blogPostsService.setFeaturedImage(id, url);
  }

  @Post(':id/social-sharing-image')
  @UseInterceptors(imageUpload)
  async uploadSocialSharingImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose an image file to upload');
    const url = await this.uploadsService.uploadImage(file);
    return this.blogPostsService.setSocialSharingImage(id, url);
  }
}
