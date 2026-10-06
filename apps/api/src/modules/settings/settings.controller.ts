import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all application settings' })
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create or update application settings (Admin only)' })
  update(@Body() body: Record<string, string>) {
    return this.settingsService.update(body);
  }
}
