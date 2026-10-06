import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { existsSync } from 'fs';
import { basename, join } from 'path';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  private readonly root = join(process.cwd(), 'uploads');

  @Get(':folder/:file')
  @ApiOperation({ summary: 'Serve uploaded static files (product images)' })
  serve(@Param('folder') folder: string, @Param('file') file: string, @Res() res: Response) {
    const safeFolder = basename(folder);
    const safeFile = basename(file);
    const filePath = join(this.root, safeFolder, safeFile);

    if (!filePath.startsWith(this.root) || !existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'Archivo no encontrado' });
      }
    });
  }
}
