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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CreateBlogPostDto } from '../dto/post/create-blog-post.dto';
import { QueryBlogPostDto } from '../dto/post/query-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/post/update-blog-post.dto';
import { BlogPostsService } from '../services/blog-posts.service';

const imageStorage = diskStorage({
  destination: process.env.UPLOAD_DEST || './uploads',
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

@Controller('blog/posts')
@UseGuards(SupabaseAuthGuard)
export class BlogPostsController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

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
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage }))
  uploadFeaturedImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const path = `/uploads/${file.filename}`;
    return this.blogPostsService.setFeaturedImage(id, path);
  }

  @Post(':id/social-sharing-image')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage }))
  uploadSocialSharingImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const path = `/uploads/${file.filename}`;
    return this.blogPostsService.setSocialSharingImage(id, path);
  }
}
