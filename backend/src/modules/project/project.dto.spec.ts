/**
 * TDD: 项目 DTO / Entity — 新类型系统
 * RED -> GREEN -> REFACTOR
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateGlobalSettingsDto,
  AddRoleDto,
  AddSceneDto,
  ProjectEntity,
} from './project.dto';

describe('CreateProjectDto', () => {
  it('should validate a minimal valid DTO', async () => {
    const dto = plainToInstance(CreateProjectDto, { title: '测试项目' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if title is empty string', async () => {
    const dto = plainToInstance(CreateProjectDto, { title: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if title is missing', async () => {
    const dto = plainToInstance(CreateProjectDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateGlobalSettingsDto', () => {
  it('should accept valid global settings', async () => {
    const dto = plainToInstance(UpdateGlobalSettingsDto, {
      storyType: 'sci-fi',
      animeStyle: 'japanese',
      aspectRatio: '16:9',
      tone: '热血战斗',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow partial updates', async () => {
    const dto = plainToInstance(UpdateGlobalSettingsDto, { storyType: 'comedy' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('AddRoleDto', () => {
  it('should validate a valid role', async () => {
    const dto = plainToInstance(AddRoleDto, {
      name: '霍去病',
      description: '大汉战神',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail without name', async () => {
    const dto = plainToInstance(AddRoleDto, { description: '描述' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('AddSceneDto', () => {
  it('should validate a valid scene', async () => {
    const dto = plainToInstance(AddSceneDto, {
      description: '开场远景，大漠孤烟直',
      duration: 3,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should use default duration if not provided', async () => {
    const dto = plainToInstance(AddSceneDto, { description: '场景描述' });
    // duration is optional with a default; validation should pass
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('UpdateProjectDto', () => {
  it('should accept optional fields', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      title: '新标题',
      script: '新剧本内容',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept empty object (no updates)', async () => {
    const dto = plainToInstance(UpdateProjectDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
