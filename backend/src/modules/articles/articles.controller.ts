import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
} from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { ArticlesService } from './articles.service';
import {
  CreateArticleDto,
  QueryArticlesDto,
  UpdateArticleDto,
} from './dto/article.dto';

@ApiTags('Actualités')
@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly audit: AuditService,
  ) {}

  // ─── Site vitrine ────────────────────────────────────────────────────────

  @Public()
  @Get('publies')
  @ApiOperation({ summary: 'Articles publiés, paginés et filtrables (US-PUB-04)' })
  publies(@Query() query: QueryArticlesDto) {
    return this.articles.findPublies(query);
  }

  @Public()
  @Get('recents')
  @ApiOperation({ summary: 'Trois derniers articles (page d’accueil)' })
  recents() {
    return this.articles.findRecents(3);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Catégories et nombre d’articles publiés' })
  categories() {
    return this.articles.categoriesAvecCompte();
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Détail d’un article publié' })
  bySlug(@Param('slug') slug: string) {
    return this.articles.findBySlugPublic(slug);
  }

  // ─── Back-office ─────────────────────────────────────────────────────────

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Tous les articles, brouillons compris' })
  findAll(@Query() query: QueryArticlesDto) {
    return this.articles.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Détail d’un article pour édition' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articles.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Rédige un article (US-ADM-10)' })
  async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const article = await this.articles.create({
      ...dto,
      auteur: dto.auteur ?? `${user.prenom} ${user.nom}`,
    });
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'article',
      entityId: article.id,
      metadata: { titre: article.titre, statut: article.statut },
      request,
    });
    return article;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifie un article' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const article = await this.articles.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'article',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return article;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprime un article' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.articles.remove(id);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'article',
      entityId: id,
      request,
    });
    return { message: 'Article supprimé.' };
  }
}
