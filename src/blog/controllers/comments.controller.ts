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
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CreateCommentDto } from '../dto/comment/create-comment.dto';
import { UpdateCommentDto } from '../dto/comment/update-comment.dto';
import { CommentsService } from '../services/comments.service';

@Controller('blog')
@UseGuards(SupabaseAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  create(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, dto);
  }

  @Get('posts/:postId/comments')
  findByPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query('approvedOnly') approvedOnly?: string,
  ) {
    return this.commentsService.findByPost(
      postId,
      approvedOnly === 'true',
    );
  }

  @Patch('comments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, dto);
  }

  @Patch('comments/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.approve(id);
  }

  @Delete('comments/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.remove(id);
  }
}
