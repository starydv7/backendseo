import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Public visitor comment — always pending moderation (isApproved forced false). */
export class PublicCreateCommentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  authorName: string;

  @IsEmail()
  @MaxLength(160)
  authorEmail: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
