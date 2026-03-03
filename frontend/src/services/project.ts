import { apiClient } from './api'
import type { Project } from '@/types'

/**
 * 项目管理 API 服务
 * 对接后端 /api/projects 接口
 */
class ProjectService {
  /**
   * 创建新项目
   */
  async create(data: { title: string }): Promise<Project> {
    return apiClient.post('/projects', data)
  }

  /**
   * 获取所有项目列表
   */
  async getAll(): Promise<Project[]> {
    return apiClient.get('/projects')
  }

  /**
   * 获取单个项目详情
   */
  async getOne(id: string): Promise<Project> {
    return apiClient.get(`/projects/${id}`)
  }

  /**
   * 更新项目
   */
  async update(id: string, data: Partial<Project>): Promise<Project> {
    return apiClient.put(`/projects/${id}`, data)
  }

  /**
   * 保存项目完整状态
   */
  async saveFullProject(id: string, data: Project): Promise<Project> {
    return apiClient.put(`/projects/${id}/full`, data)
  }

  /**
   * 删除项目
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/projects/${id}`)
  }

  /**
   * 更新全局设置
   */
  async updateGlobalSettings(
    id: string,
    settings: Partial<Project['globalSettings']>
  ): Promise<Project> {
    return apiClient.patch(`/projects/${id}/global-settings`, settings)
  }

  /**
   * 添加角色
   */
  async addRole(id: string, role: any): Promise<any> {
    return apiClient.post(`/projects/${id}/roles`, role)
  }

  /**
   * 删除角色
   */
  async removeRole(id: string, roleId: string): Promise<void> {
    return apiClient.delete(`/projects/${id}/roles/${roleId}`)
  }

  /**
   * 添加场景
   */
  async addScene(id: string, scene: any): Promise<any> {
    return apiClient.post(`/projects/${id}/scenes`, scene)
  }

  /**
   * 更新场景
   */
  async updateScene(id: string, sceneId: string, scene: any): Promise<any> {
    return apiClient.patch(`/projects/${id}/scenes/${sceneId}`, scene)
  }

  /**
   * 删除场景
   */
  async removeScene(id: string, sceneId: string): Promise<void> {
    return apiClient.delete(`/projects/${id}/scenes/${sceneId}`)
  }

  /**
   * 添加道具
   */
  async addProp(id: string, prop: any): Promise<any> {
    return apiClient.post(`/projects/${id}/props`, prop)
  }

  /**
   * 删除道具
   */
  async removeProp(id: string, propId: string): Promise<void> {
    return apiClient.delete(`/projects/${id}/props/${propId}`)
  }

  /**
   * 添加场景背景
   */
  async addBackground(id: string, background: any): Promise<any> {
    return apiClient.post(`/projects/${id}/scene-backgrounds`, background)
  }

  /**
   * 删除场景背景
   */
  async removeBackground(id: string, backgroundId: string): Promise<void> {
    return apiClient.delete(`/projects/${id}/scene-backgrounds/${backgroundId}`)
  }

  /**
   * 添加语音轨道
   */
  async addVoiceTrack(id: string, track: any): Promise<any> {
    return apiClient.post(`/projects/${id}/voice-tracks`, track)
  }

  /**
   * 删除语音轨道
   */
  async removeVoiceTrack(id: string, trackId: string): Promise<void> {
    return apiClient.delete(`/projects/${id}/voice-tracks/${trackId}`)
  }
}

export const projectService = new ProjectService()
