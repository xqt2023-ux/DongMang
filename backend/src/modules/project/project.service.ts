import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../../database/database.service';
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
  ProjectEntity,
  RoleEntity,
  SceneEntity,
  PropEntity,
  SceneBackgroundEntity,
  VoiceTrackEntity,
} from './project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.getDb();
  }

  // ===== PROJECT CRUD =====

  create(dto: CreateProjectDto): ProjectEntity {
    const id = uuid();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO projects (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(id, dto.title, now, now);
    return this.findOne(id);
  }

  findAll(): ProjectEntity[] {
    const rows = this.db.prepare(
      'SELECT id FROM projects ORDER BY created_at DESC, rowid DESC',
    ).all() as { id: string }[];
    return rows.map((r) => this.findOne(r.id));
  }

  findOne(id: string): ProjectEntity {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) throw new NotFoundException(`项目 ${id} 不存在`);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      script: row.script,
      status: row.status,
      coverUrl: row.cover_url,
      videoUrl: row.video_url,
      shareToken: row.share_token,
      globalSettings: {
        storyType: row.gs_story_type,
        customStoryType: row.gs_custom_story_type,
        animeStyle: row.gs_anime_style,
        aspectRatio: row.gs_aspect_ratio,
        tone: row.gs_tone,
      },
      roles: this.getRoles(id),
      scenes: this.getScenes(id),
      props: this.getProps(id),
      sceneBackgrounds: this.getBackgrounds(id),
      voiceTracks: this.getVoiceTracks(id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  update(id: string, dto: UpdateProjectDto): ProjectEntity {
    this.findOne(id); // throws if not exists
    this.dynamicUpdate('projects', id, dto, {
      title: 'title',
      description: 'description',
      script: 'script',
      status: 'status',
      coverUrl: 'cover_url',
      videoUrl: 'video_url',
    });
    return this.findOne(id);
  }

  remove(id: string): void {
    this.findOne(id); // throws if not exists
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  // ===== GLOBAL SETTINGS =====

  updateGlobalSettings(id: string, dto: UpdateGlobalSettingsDto): ProjectEntity {
    this.findOne(id);
    this.dynamicUpdate('projects', id, dto, {
      storyType: 'gs_story_type',
      customStoryType: 'gs_custom_story_type',
      animeStyle: 'gs_anime_style',
      aspectRatio: 'gs_aspect_ratio',
      tone: 'gs_tone',
    });
    return this.findOne(id);
  }

  // ===== ROLES =====

  addRole(projectId: string, dto: AddRoleDto): RoleEntity {
    this.findOne(projectId);
    const id = uuid();
    this.db.prepare(`
      INSERT INTO roles (id, project_id, name, description, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, dto.name, dto.description || '', dto.avatarUrl || '');
    this.touch(projectId);
    return { id, name: dto.name, description: dto.description || '', avatarUrl: dto.avatarUrl || '', voiceId: '' };
  }

  removeRole(projectId: string, roleId: string): void {
    this.findOne(projectId);
    this.db.prepare('DELETE FROM roles WHERE id = ? AND project_id = ?').run(roleId, projectId);
    this.touch(projectId);
  }

  // ===== SCENES =====

  addScene(projectId: string, dto: AddSceneDto): SceneEntity {
    this.findOne(projectId);
    const id = uuid();
    const maxOrder = (this.db.prepare(
      'SELECT COALESCE(MAX("order"), 0) as max_order FROM scenes WHERE project_id = ?',
    ).get(projectId) as any).max_order;
    const order = maxOrder + 1;
    const duration = dto.duration ?? 3;

    this.db.prepare(`
      INSERT INTO scenes (id, project_id, "order", description, duration, transition, narration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, order, dto.description, duration, dto.transition || 'fade', dto.narration || '');
    this.touch(projectId);

    return {
      id, order, description: dto.description, imageUrl: '', videoUrl: '',
      thumbnailUrl: '', duration, transition: dto.transition || 'fade',
      narration: dto.narration || '', backgroundId: '',
      cameraMovement: { type: 'static', speed: 0 },
      status: 'pending', videoStatus: 'pending', roleIds: [],
    };
  }

  updateScene(projectId: string, sceneId: string, dto: UpdateSceneDto): SceneEntity {
    this.findOne(projectId);
    const scene = this.db.prepare(
      'SELECT * FROM scenes WHERE id = ? AND project_id = ?',
    ).get(sceneId, projectId) as any;
    if (!scene) throw new NotFoundException(`场景 ${sceneId} 不存在`);

    const columnMap: Record<string, string> = {
      description: 'description',
      duration: 'duration',
      transition: 'transition',
      imageUrl: 'image_url',
      videoUrl: 'video_url',
      videoStatus: 'video_status',
      narration: 'narration',
      status: 'status',
    };
    const fields: string[] = [];
    const values: any[] = [];
    for (const [dtoKey, colName] of Object.entries(columnMap)) {
      if ((dto as any)[dtoKey] !== undefined) {
        fields.push(`${colName} = ?`);
        values.push((dto as any)[dtoKey]);
      }
    }

    if (fields.length > 0) {
      values.push(sceneId);
      this.db.prepare(`UPDATE scenes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    this.touch(projectId);

    const updated = this.db.prepare('SELECT * FROM scenes WHERE id = ?').get(sceneId) as any;
    return this.mapScene(updated);
  }

  removeScene(projectId: string, sceneId: string): void {
    this.findOne(projectId);
    this.db.prepare('DELETE FROM scenes WHERE id = ? AND project_id = ?').run(sceneId, projectId);
    // Reorder remaining scenes
    const remaining = this.db.prepare(
      'SELECT id FROM scenes WHERE project_id = ? ORDER BY "order"',
    ).all(projectId) as { id: string }[];
    const stmt = this.db.prepare('UPDATE scenes SET "order" = ? WHERE id = ?');
    remaining.forEach((r, i) => stmt.run(i + 1, r.id));
    this.touch(projectId);
  }

  // ===== PROPS =====

  addProp(projectId: string, dto: AddPropDto): PropEntity {
    this.findOne(projectId);
    const id = uuid();
    this.db.prepare(`
      INSERT INTO props (id, project_id, name, description) VALUES (?, ?, ?, ?)
    `).run(id, projectId, dto.name, dto.description || '');
    this.touch(projectId);
    return { id, name: dto.name, description: dto.description || '', imageUrl: '' };
  }

  // ===== SCENE BACKGROUNDS =====

  addBackground(projectId: string, dto: AddBackgroundDto): SceneBackgroundEntity {
    this.findOne(projectId);
    const id = uuid();
    this.db.prepare(`
      INSERT INTO scene_backgrounds (id, project_id, name, description) VALUES (?, ?, ?, ?)
    `).run(id, projectId, dto.name, dto.description || '');
    this.touch(projectId);
    return { id, name: dto.name, description: dto.description || '', imageUrl: '' };
  }

  // ===== VOICE TRACKS =====

  addVoiceTrack(projectId: string, dto: AddVoiceTrackDto): VoiceTrackEntity {
    this.findOne(projectId);
    const id = uuid();
    this.db.prepare(`
      INSERT INTO voice_tracks (id, project_id, scene_id, role_id, text) VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, dto.sceneId, dto.roleId || '', dto.text || '');
    this.touch(projectId);
    return {
      id, sceneId: dto.sceneId, roleId: dto.roleId || '',
      text: dto.text || '', audioUrl: '', duration: 0, startTime: 0,
    };
  }

  // ===== HELPERS =====

  /** Build and run a dynamic UPDATE from a dto-to-column mapping */
  private dynamicUpdate(
    table: string,
    id: string,
    dto: Record<string, any>,
    columnMap: Record<string, string>,
  ): boolean {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [dtoKey, colName] of Object.entries(columnMap)) {
      if (dto[dtoKey] !== undefined) {
        fields.push(`${colName} = ?`);
        values.push(dto[dtoKey]);
      }
    }
    if (fields.length === 0) return false;
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    this.db.prepare(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  }

  private touch(projectId: string) {
    this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), projectId);
  }

  private getRoles(projectId: string): RoleEntity[] {
    const rows = this.db.prepare(
      'SELECT * FROM roles WHERE project_id = ?',
    ).all(projectId) as any[];
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description,
      avatarUrl: r.avatar_url, voiceId: r.voice_id,
    }));
  }

  private getScenes(projectId: string): SceneEntity[] {
    const rows = this.db.prepare(
      'SELECT * FROM scenes WHERE project_id = ? ORDER BY "order"',
    ).all(projectId) as any[];
    return rows.map((r) => this.mapScene(r));
  }

  private mapScene(r: any): SceneEntity {
    const roleIds = (this.db.prepare(
      'SELECT role_id FROM scene_roles WHERE scene_id = ?',
    ).all(r.id) as { role_id: string }[]).map((x) => x.role_id);

    return {
      id: r.id, order: r.order, description: r.description,
      imageUrl: r.image_url, videoUrl: r.video_url, thumbnailUrl: r.thumbnail_url,
      duration: r.duration, transition: r.transition, narration: r.narration,
      backgroundId: r.background_id,
      cameraMovement: { type: r.camera_type, speed: r.camera_speed },
      status: r.status, videoStatus: r.video_status, roleIds,
    };
  }

  private getProps(projectId: string): PropEntity[] {
    const rows = this.db.prepare(
      'SELECT * FROM props WHERE project_id = ?',
    ).all(projectId) as any[];
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description, imageUrl: r.image_url,
    }));
  }

  private getBackgrounds(projectId: string): SceneBackgroundEntity[] {
    const rows = this.db.prepare(
      'SELECT * FROM scene_backgrounds WHERE project_id = ?',
    ).all(projectId) as any[];
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description, imageUrl: r.image_url,
    }));
  }

  private getVoiceTracks(projectId: string): VoiceTrackEntity[] {
    const rows = this.db.prepare(
      'SELECT * FROM voice_tracks WHERE project_id = ?',
    ).all(projectId) as any[];
    return rows.map((r) => ({
      id: r.id, sceneId: r.scene_id, roleId: r.role_id,
      text: r.text, audioUrl: r.audio_url, duration: r.duration, startTime: r.start_time,
    }));
  }
}
