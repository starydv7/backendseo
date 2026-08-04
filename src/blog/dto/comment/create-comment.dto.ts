import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  authorName: string;

  @IsEmail()
  @MaxLength(160)
  authorEmail: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
