import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateGlobalSettingsDto,
  UpdateSceneDto,
  AddRoleDto,
  AddSceneDto,
  AddPropDto,
  AddBackgroundDto,
  AddVoiceTrackDto,
} from './project.dto';

@ApiTags('项目管理')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '创建新项目' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有项目' })
  findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新项目' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  remove(@Param('id') id: string) {
    this.projectService.remove(id);
    return { success: true };
  }

  // ===== 全局设定 =====

  @Patch(':id/global-settings')
  @ApiOperation({ summary: '更新全局设定' })
  updateGlobalSettings(
    @Param('id') id: string,
    @Body() dto: UpdateGlobalSettingsDto,
  ) {
    return this.projectService.updateGlobalSettings(id, dto);
  }

  // ===== 角色 =====

  @Post(':id/roles')
  @ApiOperation({ summary: '添加角色' })
  addRole(@Param('id') id: string, @Body() dto: AddRoleDto) {
    return this.projectService.addRole(id, dto);
  }

  @Delete(':id/roles/:roleId')
  @ApiOperation({ summary: '删除角色' })
  removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    this.projectService.removeRole(id, roleId);
    return { success: true };
  }

  // ===== 场景 =====

  @Post(':id/scenes')
  @ApiOperation({ summary: '添加场景' })
  addScene(@Param('id') id: string, @Body() dto: AddSceneDto) {
    return this.projectService.addScene(id, dto);
  }

  @Patch(':id/scenes/:sceneId')
  @ApiOperation({ summary: '更新场景' })
  updateScene(
    @Param('id') id: string,
    @Param('sceneId') sceneId: string,
    @Body() dto: UpdateSceneDto,
  ) {
    return this.projectService.updateScene(id, sceneId, dto);
  }

  @Delete(':id/scenes/:sceneId')
  @ApiOperation({ summary: '删除场景' })
  removeScene(@Param('id') id: string, @Param('sceneId') sceneId: string) {
    this.projectService.removeScene(id, sceneId);
    return { success: true };
  }

  // ===== 道具 =====

  @Post(':id/props')
  @ApiOperation({ summary: '添加道具' })
  addProp(@Param('id') id: string, @Body() dto: AddPropDto) {
    return this.projectService.addProp(id, dto);
  }

  // ===== 场景背景 =====

  @Post(':id/backgrounds')
  @ApiOperation({ summary: '添加场景背景' })
  addBackground(@Param('id') id: string, @Body() dto: AddBackgroundDto) {
    return this.projectService.addBackground(id, dto);
  }

  // ===== 配音轨道 =====

  @Post(':id/voice-tracks')
  @ApiOperation({ summary: '添加配音轨道' })
  addVoiceTrack(@Param('id') id: string, @Body() dto: AddVoiceTrackDto) {
    return this.projectService.addVoiceTrack(id, dto);
  }
}
