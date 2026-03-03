import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AssetService } from './asset.service';
import { ImportAssetFromUrlDto } from './asset.dto';

@ApiTags('资产库')
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @ApiOperation({ summary: '上传资产' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('未收到上传文件');
    return this.assetService.create(file);
  }

  @Post('import-from-url')
  @ApiOperation({ summary: '从URL导入资产' })
  importFromUrl(@Body() dto: ImportAssetFromUrlDto) {
    return this.assetService.importFromUrl(dto.url, dto.filename);
  }

  @Get()
  @ApiOperation({ summary: '获取资产列表' })
  list() {
    return this.assetService.list();
  }

  @Get(':id/content')
  @ApiOperation({ summary: '下载/预览资产内容' })
  getContent(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const asset = this.assetService.getContent(id);
    res.setHeader('Content-Type', asset.mimeType);
    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(asset.name)}"`);
    res.send(asset.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除资产' })
  remove(@Param('id') id: string) {
    this.assetService.remove(id);
    return { success: true };
  }
}