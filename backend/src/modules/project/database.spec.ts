/**
 * TDD: SQLite 数据库服务
 * RED -> GREEN -> REFACTOR
 */
import { DatabaseService } from '../../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseService', () => {
  let db: DatabaseService;
  const testDbPath = path.join(__dirname, '../../..', 'test.sqlite');

  beforeEach(() => {
    // 每个测试使用内存数据库
    db = new DatabaseService(':memory:');
    db.onModuleInit();
  });

  afterEach(() => {
    db.onModuleDestroy();
  });

  afterAll(() => {
    // 清理可能的测试数据库文件
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  describe('初始化', () => {
    it('should create projects table', () => {
      const tables = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
        .all();
      expect(tables.length).toBe(1);
    });

    it('should create roles table', () => {
      const tables = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'")
        .all();
      expect(tables.length).toBe(1);
    });

    it('should create scenes table', () => {
      const tables = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scenes'")
        .all();
      expect(tables.length).toBe(1);
    });

    it('should create props table', () => {
      const tables = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='props'")
        .all();
      expect(tables.length).toBe(1);
    });

    it('should create scene_backgrounds table', () => {
      const tables = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scene_backgrounds'")
        .all();
      expect(tables.length).toBe(1);
    });

    it('should create voice_tracks table', () => {
      const tables = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='voice_tracks'")
        .all();
      expect(tables.length).toBe(1);
    });
  });

  describe('文件模式', () => {
    it('should create database file on disk', () => {
      const fileDb = new DatabaseService(testDbPath);
      fileDb.onModuleInit();
      expect(fs.existsSync(testDbPath)).toBe(true);
      fileDb.onModuleDestroy();
    });
  });
});
