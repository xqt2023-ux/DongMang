/**
 * TDD: ProjectController — E2E API 测试
 * RED -> GREEN -> REFACTOR
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DatabaseService } from '../../database/database.service';

describe('ProjectController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [(await import('./project.controller')).ProjectController],
      providers: [
        (await import('./project.service')).ProjectService,
        {
          provide: DatabaseService,
          useFactory: () => {
            const db = new DatabaseService(':memory:');
            db.onModuleInit();
            return db;
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a project', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '测试项目' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('测试项目');
      expect(res.body.status).toBe('draft');
    });

    it('should 400 on missing title', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .send({})
        .expect(400);
    });
  });

  describe('GET /projects', () => {
    it('should return empty list', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('should return created projects', async () => {
      await request(app.getHttpServer()).post('/projects').send({ title: 'A' });
      await request(app.getHttpServer()).post('/projects').send({ title: 'B' });

      const res = await request(app.getHttpServer()).get('/projects').expect(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return project with nested data', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '详情' });

      const res = await request(app.getHttpServer())
        .get(`/projects/${create.body.id}`)
        .expect(200);

      expect(res.body.title).toBe('详情');
      expect(res.body.globalSettings).toBeDefined();
      expect(res.body.scenes).toEqual([]);
      expect(res.body.roles).toEqual([]);
    });

    it('should 404 for missing project', async () => {
      await request(app.getHttpServer())
        .get('/projects/nonexistent')
        .expect(404);
    });
  });

  describe('PUT /projects/:id', () => {
    it('should update project', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects').send({ title: '旧' });

      const res = await request(app.getHttpServer())
        .put(`/projects/${create.body.id}`)
        .send({ title: '新', script: '内容' })
        .expect(200);

      expect(res.body.title).toBe('新');
      expect(res.body.script).toBe('内容');
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete project', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects').send({ title: '删' });

      await request(app.getHttpServer())
        .delete(`/projects/${create.body.id}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${create.body.id}`)
        .expect(404);
    });
  });

  describe('PATCH /projects/:id/global-settings', () => {
    it('should update global settings', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects').send({ title: 'GS' });

      const res = await request(app.getHttpServer())
        .patch(`/projects/${create.body.id}/global-settings`)
        .send({ storyType: 'sci-fi', animeStyle: 'cinematic' })
        .expect(200);

      expect(res.body.globalSettings.storyType).toBe('sci-fi');
    });
  });

  describe('POST /projects/:id/roles', () => {
    it('should add a role', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects').send({ title: 'R' });

      const res = await request(app.getHttpServer())
        .post(`/projects/${create.body.id}/roles`)
        .send({ name: '霍去病', description: '战神' })
        .expect(201);

      expect(res.body.name).toBe('霍去病');
    });
  });

  describe('POST /projects/:id/scenes', () => {
    it('should add a scene', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects').send({ title: 'S' });

      const res = await request(app.getHttpServer())
        .post(`/projects/${create.body.id}/scenes`)
        .send({ description: '开场', duration: 3 })
        .expect(201);

      expect(res.body.description).toBe('开场');
      expect(res.body.order).toBe(1);
    });
  });

  describe('PATCH /projects/:id/scenes/:sceneId', () => {
    it('should update a scene', async () => {
      const create = await request(app.getHttpServer())
        .post('/projects').send({ title: 'SU' });

      const scene = await request(app.getHttpServer())
        .post(`/projects/${create.body.id}/scenes`)
        .send({ description: '旧', duration: 3 });

      const res = await request(app.getHttpServer())
        .patch(`/projects/${create.body.id}/scenes/${scene.body.id}`)
        .send({ description: '新', transition: 'zoom-in' })
        .expect(200);

      expect(res.body.description).toBe('新');
      expect(res.body.transition).toBe('zoom-in');
    });
  });
});
