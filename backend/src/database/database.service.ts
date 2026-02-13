import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as Database from 'better-sqlite3';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db!: Database.Database;

  constructor(private readonly dbPath: string = './data/dongmang.sqlite') {}

  onModuleInit() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.createTables();
  }

  onModuleDestroy() {
    if (this.db) this.db.close();
  }

  getDb(): Database.Database {
    return this.db;
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        script TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        cover_url TEXT NOT NULL DEFAULT '',
        video_url TEXT NOT NULL DEFAULT '',
        share_token TEXT NOT NULL DEFAULT '',
        -- global settings (flattened)
        gs_story_type TEXT NOT NULL DEFAULT '',
        gs_custom_story_type TEXT NOT NULL DEFAULT '',
        gs_anime_style TEXT NOT NULL DEFAULT 'japanese',
        gs_aspect_ratio TEXT NOT NULL DEFAULT '16:9',
        gs_tone TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        voice_id TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        video_url TEXT NOT NULL DEFAULT '',
        thumbnail_url TEXT NOT NULL DEFAULT '',
        duration REAL NOT NULL DEFAULT 3,
        transition TEXT NOT NULL DEFAULT 'fade',
        narration TEXT NOT NULL DEFAULT '',
        background_id TEXT NOT NULL DEFAULT '',
        camera_type TEXT NOT NULL DEFAULT 'static',
        camera_speed REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        video_status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS scene_roles (
        scene_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        PRIMARY KEY (scene_id, role_id),
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS props (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS scene_backgrounds (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS voice_tracks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scene_id TEXT NOT NULL DEFAULT '',
        role_id TEXT NOT NULL DEFAULT '',
        text TEXT NOT NULL DEFAULT '',
        audio_url TEXT NOT NULL DEFAULT '',
        duration REAL NOT NULL DEFAULT 0,
        start_time REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
  }
}
