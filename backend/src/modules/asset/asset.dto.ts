import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class AssetMetadataDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  contentUrl!: string;

  @ApiProperty()
  downloadUrl!: string;
}

export class ImportAssetFromUrlDto {
  @ApiProperty({ description: '远程文件URL' })
  @IsString()
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiProperty({ description: '可选文件名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;
}

export interface AssetContent {
  id: string;
  name: string;
  mimeType: string;
  data: Buffer;
}