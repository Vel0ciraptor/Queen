import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { CatalogService } from './catalog.service';

@ApiTags('Public Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('placeholder/:seed')
  @ApiOperation({ summary: 'Placeholder image for demo products (no external storage)' })
  getPlaceholder(@Param('seed') seed: string, @Res() res: Response) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

    const palettes = [
      ['#FFBFB6', '#E74656'],
      ['#E74656', '#D90E75'],
      ['#D90E75', '#8E1C63'],
      ['#FFBFB6', '#D90E75'],
      ['#F8C8D4', '#E74656'],
    ];
    const [c1, c2] = palettes[hash % palettes.length];
    const label = (seed.split('-').map((w) => w[0] || '').join('').slice(0, 3)).toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="750" fill="url(#g)"/>
  <circle cx="${100 + (hash % 400)}" cy="${80 + (hash % 200)}" r="140" fill="#ffffff" opacity="0.12"/>
  <circle cx="${450 - (hash % 300)}" cy="${600 - (hash % 200)}" r="180" fill="#ffffff" opacity="0.10"/>
  <text x="300" y="390" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="bold" fill="#ffffff" text-anchor="middle" opacity="0.95">${label}</text>
  <text x="300" y="460" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#ffffff" text-anchor="middle" opacity="0.85">Queen Style</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get active categories for public storefront' })
  getCategories() {
    return this.catalogService.getCatalogCategories();
  }

  @Get('products')
  @ApiOperation({ summary: 'Get products in public catalog with filters' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getProducts(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.catalogService.getCatalogProducts(categoryId, search);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products for homepage banner/carousel' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFeatured(@Query('limit') limit?: number) {
    return this.catalogService.getFeaturedProducts(limit ? Number(limit) : undefined);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product details by ID or SKU (Public)' })
  getProduct(@Param('id') id: string) {
    return this.catalogService.getProductDetails(id);
  }
}
