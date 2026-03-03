import { apiClient } from './api'

export interface AssetItem {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: string
  contentUrl: string
  downloadUrl: string
}

class AssetService {
  async listAssets(): Promise<AssetItem[]> {
    return apiClient.get('/assets')
  }

  async uploadAsset(file: File): Promise<AssetItem> {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/assets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async importAssetFromUrl(url: string, filename?: string): Promise<AssetItem> {
    return apiClient.post('/assets/import-from-url', {
      url,
      filename,
    })
  }

  async deleteAsset(id: string): Promise<void> {
    return apiClient.delete(`/assets/${id}`)
  }
}

export const assetService = new AssetService()