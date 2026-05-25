import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ListsService } from './lists.service.js';
import {
  AddItemSchema,
  CreateListSchema,
  RenameListSchema,
  parseFilters,
  type AddItemInput,
  type CreateListInput,
  type RenameListInput,
} from './dto.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListsController {
  constructor(private readonly svc: ListsService) {}

  /** Kullanıcının listeleri (Favorilerim ilk, item sayılarıyla). */
  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.svc.getLists(user.id);
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(CreateListSchema)) body: CreateListInput,
  ) {
    return this.svc.createList(user.id, body.name);
  }

  /** Favorilere ekle/çıkar (varsayılan liste; statik route — :id'den önce). */
  @Post('favorite')
  addFavorite(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(AddItemSchema)) body: AddItemInput,
  ) {
    return this.svc.addFavorite(user.id, body.ilan_id);
  }

  @Delete('favorite/:ilanId')
  removeFavorite(@CurrentUser() user: AuthedUser, @Param('ilanId') ilanId: string) {
    return this.svc.removeFavorite(user.id, ilanId);
  }

  /** Liste detayı + filtre/sıralama (query). */
  @Get(':id')
  detail(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Query() q: Record<string, unknown>,
  ) {
    return this.svc.getListDetail(user.id, id, parseFilters(q));
  }

  /** Liderlik tablosu (skor sırası) + AI yorumu. */
  @Post(':id/analyze')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyze(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Query() q: Record<string, unknown>,
  ) {
    return this.svc.analyzeList(user.id, id, parseFilters(q));
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RenameListSchema)) body: RenameListInput,
  ) {
    return this.svc.renameList(user.id, id, body.name);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.svc.deleteList(user.id, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddItemSchema)) body: AddItemInput,
  ) {
    return this.svc.addItem(user.id, id, body.ilan_id);
  }

  @Delete(':id/items/:ilanId')
  removeItem(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Param('ilanId') ilanId: string,
  ) {
    return this.svc.removeItem(user.id, id, ilanId);
  }
}
