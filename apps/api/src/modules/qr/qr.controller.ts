import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('QR Codes')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('scan/:code')
  @ApiOperation({ summary: 'Scan or resolve a QR code / SKU to get product info' })
  scan(@Param('code') code: string) {
    return this.qrService.scanCode(code);
  }

  @Post('generate/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate QR code image for a product' })
  generate(@Param('productId') productId: string) {
    return this.qrService.generateProductQr(productId);
  }

  @Post('batch-generate')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate QR codes for all products missing one' })
  batchGenerate() {
    return this.qrService.batchGenerateQrCodes();
  }
}
