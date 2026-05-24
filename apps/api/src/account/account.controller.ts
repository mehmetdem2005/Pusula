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
    // 1. Profil + ilişkili veriyi sil (FK: chat/usage/subscription/quota/audit cascade;
    //    ilanlar.owner_user_id -> NULL ile paylaşılan havuza anonimleşir).
    //    Hata olursa DURDUR — auth user'ı silip yetim PII bırakma (KVKK).
    const { error: profErr } = await this.sb.from('users').delete().eq('id', user.id);
    if (profErr) {
      this.logger.error(`profile delete failed: ${profErr.message}`);
      throw new InternalServerErrorException('Hesap verisi silinemedi');
    }
    // 2. Auth kullanıcısını sil (girişi tamamen kapatır). Hata olursa 500 → kullanıcı bilir.
    const { error: authErr } = await this.sb.auth.admin.deleteUser(user.id);
    if (authErr) {
      this.logger.error(`admin.deleteUser failed: ${authErr.message}`);
      throw new InternalServerErrorException('Auth hesabı silinemedi');
    }
    this.logger.log(`Account deleted: ${user.id}`);
  }
}
