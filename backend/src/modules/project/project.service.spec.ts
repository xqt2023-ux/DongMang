/**
 * TDD: ProjectService — 新 7 步工作流 CRUD（SQLite）
 * RED -> GREEN -> REFACTOR
 */
import { NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { DatabaseService } from '../../database/database.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.onModuleInit();
    service = new ProjectService(db);
  });

  afterEach(() => {
    db.onModuleDestroy();
  });

  // ===== CREATE =====
  describe('create', () => {
    it('should create a project with default values', () => {
      const project = service.create({ title: '测试项目' });
      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.title).toBe('测试项目');
      expect(project.status).toBe('draft');
      expect(project.globalSettings).toBeDefined();
      expect(project.scenes).toEqual([]);
      expect(project.roles).toEqual([]);
    });

    it('should persist the project', () => {
      const created = service.create({ title: '持久化测试' });
      const found = service.findOne(created.id);
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('持久化测试');
    });
  });

  // ===== FIND ALL =====
  describe('findAll', () => {
    it('should return empty array when no projects', () => {
      expect(service.findAll()).toEqual([]);
    });

    it('should return all projects sorted by createdAt desc', () => {
      service.create({ title: 'A' });
      service.create({ title: 'B' });
      const all = service.findAll();
      expect(all.length).toBe(2);
      // B 后创建，应排在前面
      expect(all[0].title).toBe('B');
    });
  });

  // ===== FIND ONE =====
  describe('findOne', () => {
    it('should return project with nested data', () => {
      const created = service.create({ title: '完整测试' });
      service.addRole(created.id, { name: '主角', description: '描述' });
      service.addScene(created.id, { description: '场景1', duration: 3 });

      const p = service.findOne(created.id);
      expect(p.roles.length).toBe(1);
      expect(p.roles[0].name).toBe('主角');
      expect(p.scenes.length).toBe(1);
      expect(p.scenes[0].description).toBe('场景1');
    });

    it('should throw NotFoundException for missing project', () => {
      expect(() => service.findOne('nonexistent')).toThrow(NotFoundException);
    });
  });

  // ===== UPDATE =====
  describe('update', () => {
    it('should update project title', () => {
      const p = service.create({ title: '旧标题' });
      const updated = service.update(p.id, { title: '新标题' });
      expect(updated.title).toBe('新标题');
    });

    it('should update project script', () => {
      const p = service.create({ title: 'T' });
      const updated = service.update(p.id, { script: '第一幕：开篇' });
      expect(updated.script).toBe('第一幕：开篇');
    });

    it('should throw for missing project', () => {
      expect(() => service.update('none', { title: 'x' })).toThrow(NotFoundException);
    });
  });

  // ===== DELETE =====
  describe('remove', () => {
    it('should remove project and all related data', () => {
      const p = service.create({ title: '删除测试' });
      service.addRole(p.id, { name: '角色', description: '' });
      service.addScene(p.id, { description: '场景', duration: 3 });
      service.remove(p.id);
      expect(() => service.findOne(p.id)).toThrow(NotFoundException);
      expect(service.findAll()).toEqual([]);
    });

    it('should throw for missing project', () => {
      expect(() => service.remove('x')).toThrow(NotFoundException);
    });
  });

  // ===== GLOBAL SETTINGS =====
  describe('updateGlobalSettings', () => {
    it('should update global settings', () => {
      const p = service.create({ title: 'GS' });
      const updated = service.updateGlobalSettings(p.id, {
        storyType: 'sci-fi',
        animeStyle: 'cinematic',
        aspectRatio: '16:9',
        tone: '热血',
      });
      expect(updated.globalSettings.storyType).toBe('sci-fi');
      expect(updated.globalSettings.animeStyle).toBe('cinematic');
      expect(updated.globalSettings.tone).toBe('热血');
    });

    it('should support partial global settings update', () => {
      const p = service.create({ title: 'GS2' });
      service.updateGlobalSettings(p.id, { storyType: 'comedy' });
      const found = service.findOne(p.id);
      expect(found.globalSettings.storyType).toBe('comedy');
    });
  });

  // ===== ROLES =====
  describe('addRole / removeRole', () => {
    it('should add a role to the project', () => {
      const p = service.create({ title: 'R' });
      const role = service.addRole(p.id, { name: '霍去病', description: '大汉战神' });
      expect(role.id).toBeDefined();
      expect(role.name).toBe('霍去病');

      const found = service.findOne(p.id);
      expect(found.roles.length).toBe(1);
    });

    it('should remove a role', () => {
      const p = service.create({ title: 'R2' });
      const role = service.addRole(p.id, { name: 'R', description: '' });
      service.removeRole(p.id, role.id);
      const found = service.findOne(p.id);
      expect(found.roles.length).toBe(0);
    });
  });

  // ===== SCENES =====
  describe('addScene / updateScene / removeScene', () => {
    it('should add scene with auto order', () => {
      const p = service.create({ title: 'S' });
      const s1 = service.addScene(p.id, { description: 'S1', duration: 3 });
      const s2 = service.addScene(p.id, { description: 'S2', duration: 4 });
      expect(s1.order).toBe(1);
      expect(s2.order).toBe(2);
    });

    it('should update scene fields', () => {
      const p = service.create({ title: 'SU' });
      const s = service.addScene(p.id, { description: '旧', duration: 3 });
      service.updateScene(p.id, s.id, {
        description: '新描述',
        duration: 5,
        transition: 'zoom-in',
      });
      const found = service.findOne(p.id);
      expect(found.scenes[0].description).toBe('新描述');
      expect(found.scenes[0].duration).toBe(5);
      expect(found.scenes[0].transition).toBe('zoom-in');
    });

    it('should remove scene and reorder', () => {
      const p = service.create({ title: 'SR' });
      const s1 = service.addScene(p.id, { description: 'A', duration: 3 });
      service.addScene(p.id, { description: 'B', duration: 3 });
      service.removeScene(p.id, s1.id);
      const found = service.findOne(p.id);
      expect(found.scenes.length).toBe(1);
      expect(found.scenes[0].order).toBe(1);
      expect(found.scenes[0].description).toBe('B');
    });
  });

  // ===== PROPS =====
  describe('addProp', () => {
    it('should add a prop', () => {
      const p = service.create({ title: 'P' });
      const prop = service.addProp(p.id, { name: '宝剑', description: '神兵利器' });
      expect(prop.id).toBeDefined();
      expect(prop.name).toBe('宝剑');
    });
  });

  // ===== SCENE BACKGROUNDS =====
  describe('addBackground', () => {
    it('should add a background', () => {
      const p = service.create({ title: 'BG' });
      const bg = service.addBackground(p.id, { name: '大漠', description: '黄沙漫天' });
      expect(bg.id).toBeDefined();
      const found = service.findOne(p.id);
      expect(found.sceneBackgrounds.length).toBe(1);
    });
  });

  // ===== VOICE TRACKS =====
  describe('addVoiceTrack', () => {
    it('should add a voice track', () => {
      const p = service.create({ title: 'VT' });
      const s = service.addScene(p.id, { description: '旁白', duration: 3 });
      const track = service.addVoiceTrack(p.id, {
        sceneId: s.id,
        text: '故事从这里开始',
      });
      expect(track.id).toBeDefined();
      expect(track.sceneId).toBe(s.id);
    });
  });
});
