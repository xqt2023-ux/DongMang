import { IsString, IsOptional, IsNumber, MinLength, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== 项目 CRUD ====================

export class CreateProjectDto {
  @ApiProperty({ description: '项目标题' })
  @IsString()
  @MinLength(1)
  title!: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  script?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;
}

export class SaveProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  script?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  globalSettings?: {
    storyType?: string;
    customStoryType?: string;
    animeStyle?: string;
    aspectRatio?: string;
    tone?: string;
  };

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  roles?: any[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  scenes?: any[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  props?: any[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  sceneBackgrounds?: any[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  voiceTracks?: any[];
}

// ==================== 全局设定 ====================

export class UpdateGlobalSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customStoryType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  animeStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tone?: string;
}

// ==================== 角色 ====================

export class AddRoleDto {
  @ApiProperty({ description: '角色名' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

// ==================== 场景 ====================

export class AddSceneDto {
  @ApiProperty({ description: '场景描述' })
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narration?: string;
}

export class UpdateSceneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

// ==================== 道具 ====================

export class AddPropDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ==================== 场景背景 ====================

export class AddBackgroundDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ==================== 配音轨道 ====================

export class AddVoiceTrackDto {
  @ApiProperty()
  @IsString()
  sceneId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;
}

// ==================== 返回实体 ====================

export interface GlobalSettingsEntity {
  storyType: string;
  customStoryType: string;
  animeStyle: string;
  aspectRatio: string;
  tone: string;
}

export interface RoleEntity {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  voiceId: string;
  roleForms?: any[];
}

export interface SceneEntity {
  id: string;
  order: number;
  description: string;
  imageUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  transition: string;
  narration: string;
  backgroundId: string;
  cameraMovement: { type: string; speed: number };
  status: string;
  videoStatus: string;
  roleIds: string[];
}

export interface PropEntity {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface SceneBackgroundEntity {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface VoiceTrackEntity {
  id: string;
  sceneId: string;
  roleId: string;
  text: string;
  audioUrl: string;
  duration: number;
  startTime: number;
}

export interface ProjectEntity {
  id: string;
  title: string;
  description: string;
  script: string;
  status: string;
  coverUrl: string;
  videoUrl: string;
  shareToken: string;
  globalSettings: GlobalSettingsEntity;
  roles: RoleEntity[];
  scenes: SceneEntity[];
  props: PropEntity[];
  sceneBackgrounds: SceneBackgroundEntity[];
  voiceTracks: VoiceTrackEntity[];
  createdAt: string;
  updatedAt: string;
}
