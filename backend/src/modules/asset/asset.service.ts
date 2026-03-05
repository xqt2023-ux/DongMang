import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { AssetContent, AssetMetadataDto } from './asset.dto';

@Injectable()
export class AssetService {
  constructor(private readonly database: DatabaseService) {}
  private static readonly MAX_REMOTE_FILE_SIZE = 100 * 1024 * 1024;
  private static readonly REMOTE_FETCH_TIMEOUT_MS = 120_000;
  private static readonly REMOTE_FETCH_RETRIES = 2;

  private get db() {
    return this.database.getDb();
  }

  create(file: Express.Multer.File): AssetMetadataDto {
    if (!file) throw new BadRequestException('未收到上传文件');
    return this.createFromBuffer(file.originalname, file.mimetype, file.buffer);
  }

  async importFromUrl(url: string, filename?: string): Promise<AssetMetadataDto> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new BadRequestException('无效的URL');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('仅支持 http/https URL');
    }

    try {
      const response = await this.fetchRemoteWithRetry(parsedUrl.toString());

      if (!response.ok) {
        throw new BadRequestException(`远程文件下载失败: HTTP ${response.status}`);
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > AssetService.MAX_REMOTE_FILE_SIZE) {
        throw new BadRequestException('远程文件过大（超过100MB）');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new BadRequestException('远程文件为空');
      }
      if (arrayBuffer.byteLength > AssetService.MAX_REMOTE_FILE_SIZE) {
        throw new BadRequestException('远程文件过大（超过100MB）');
      }

      const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
      const safeName = this.resolveRemoteFilename(parsedUrl, filename, mimeType);

      return this.createFromBuffer(safeName, mimeType, Buffer.from(arrayBuffer));
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new BadRequestException('远程文件下载超时（可稍后重试）');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('远程文件导入失败');
    }
  }

  private async fetchRemoteWithRetry(url: string): Promise<Response> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= AssetService.REMOTE_FETCH_RETRIES; attempt += 1) {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), AssetService.REMOTE_FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          signal: abortController.signal,
          headers: {
            'User-Agent': 'DongMangAssetImporter/1.0',
            'Accept': 'image/*,video/*,*/*;q=0.8',
          },
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new BadRequestException('远程文件下载失败: HTTP 403（链接可能已过期）');
          }
          if ((response.status >= 500 || response.status === 429) && attempt < AssetService.REMOTE_FETCH_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
            continue;
          }
          throw new BadRequestException(`远程文件下载失败: HTTP ${response.status}`);
        }

        return response;
      } catch (error: any) {
        lastError = error;
        const retryable = error?.name === 'AbortError';
        if (retryable && attempt < AssetService.REMOTE_FETCH_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new BadRequestException('远程文件导入失败');
  }

  list(): AssetMetadataDto[] {
    const rows = this.db.prepare(
      'SELECT id, name, mime_type, size, created_at FROM assets ORDER BY created_at DESC'
    ).all() as Array<{ id: string; name: string; mime_type: string; size: number; created_at: string }>;

    return rows.map((row) => this.toMetadata(row));
  }

  getContent(id: string): AssetContent {
    const row = this.db.prepare(
      'SELECT id, name, mime_type, data FROM assets WHERE id = ?'
    ).get(id) as { id: string; name: string; mime_type: string; data: Buffer } | undefined;

    if (!row) throw new NotFoundException(`资产 ${id} 不存在`);

    return {
      id: row.id,
      name: row.name,
      mimeType: row.mime_type,
      data: row.data,
    };
  }

  remove(id: string): void {
    const result = this.db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    if (result.changes === 0) throw new NotFoundException(`资产 ${id} 不存在`);
  }

  private createFromBuffer(name: string, mimeType: string, data: Buffer): AssetMetadataDto {
    const id = uuid();
    const now = new Date().toISOString();

    this.db.prepare(
      'INSERT INTO assets (id, name, mime_type, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, mimeType, data.length, data, now);

    return this.toMetadata({
      id,
      name,
      mime_type: mimeType,
      size: data.length,
      created_at: now,
    });
  }

  private resolveRemoteFilename(parsedUrl: URL, filename: string | undefined, mimeType: string): string {
    const raw = (filename || parsedUrl.pathname.split('/').pop() || '').trim();
    const sanitized = raw.replace(/[\\/:*?"<>|]+/g, '_');
    if (sanitized) return sanitized;

    const extByMime: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const ext = extByMime[mimeType] || 'bin';
    return `remote-asset.${ext}`;
  }

  private toMetadata(row: { id: string; name: string; mime_type: string; size: number; created_at: string }): AssetMetadataDto {
    const contentUrl = `/api/assets/${row.id}/content`;
    return {
      id: row.id,
      name: row.name,
      mimeType: row.mime_type,
      size: row.size,
      createdAt: row.created_at,
      contentUrl,
      downloadUrl: `${contentUrl}?download=1`,
    };
  }
}