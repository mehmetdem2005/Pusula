import {
  Controller,
  Delete,
  HttpCode,
  Inject,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';
import { JwtAuthGuard, CurrentUser, type AuthedUser } from '../auth/jwt.guard.js';

/**
 * Hesap yönetimi — kullanıcının kendi hesabını silmesi.
 * Auth kullanıcı silme service-role gerektirir (client-side yapılamaz).
 */
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  @Delete()
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthedUser): Promise<void> {
    // 1. auth kullanıcısını sil (girişi tamamen kapatır)
    const { error: authErr } = await this.sb.auth.admin.deleteUser(user.id);
    if (authErr) {
      this.logger.error(`admin.deleteUser failed: ${authErr.message}`);
      throw new InternalServerErrorException('Hesap silinemedi');
    }
    // 2. public profil + ilişkili verileri temizle (FK cascade)
    const { error: profErr } = await this.sb.from('users').delete().eq('id', user.id);
    if (profErr) {
      this.logger.warn(`users profile delete: ${profErr.message}`);
    }
    this.logger.log(`Account deleted: ${user.id}`);
  }
}
