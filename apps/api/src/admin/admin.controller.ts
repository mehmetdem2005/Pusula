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
import { z } from 'zod';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';

const UpdateUserSchema = z
  .object({
    role: z.enum(['individual', 'agent', 'dealer', 'admin']).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((b) => b.role !== undefined || b.suspended !== undefined, {
    message: 'role veya suspended gerekli',
  });
type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

const ResolveReportSchema = z.object({
  status: z.enum(['reviewing', 'actioned', 'dismissed']),
  resolver_note: z.string().max(2000).optional(),
});
type ResolveReportInput = z.infer<typeof ResolveReportSchema>;

const AddAdminSchema = z.object({ email: z.string().email() });
type AddAdminInput = z.infer<typeof AddAdminSchema>;

const UpdateProviderSchema = z.object({
  is_active: z.boolean().optional(),
  monthly_token_cap: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(2000).optional(),
});
type UpdateProviderInput = z.infer<typeof UpdateProviderSchema>;

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  /** Çağıran admin mi? (throw etmez — panel kapısı bununla karar verir.) */
  @Get('me')
  me(@CurrentUser() user: AuthedUser) {
    return this.svc.isAdmin(user);
  }

  @Get('overview')
  overview(@CurrentUser() user: AuthedUser) {
    return this.svc.overview(user);
  }

  @Get('audit')
  audit(@CurrentUser() user: AuthedUser) {
    return this.svc.recentAudit(user);
  }

  // ── Kullanıcılar ──
  @Get('users')
  users(@CurrentUser() user: AuthedUser, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.svc.listUsers(user, q, limit ? Number(limit) : undefined);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserInput,
  ) {
    return this.svc.updateUser(user, id, body);
  }

  // ── İlanlar ──
  @Get('listings')
  listings(
    @CurrentUser() user: AuthedUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listListings(user, status, q, limit ? Number(limit) : undefined);
  }

  @Post('listings/:id/takedown')
  takedown(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.svc.setListingStatus(user, id, 'removed');
  }

  @Post('listings/:id/restore')
  restore(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.svc.setListingStatus(user, id, 'published');
  }

  // ── Raporlar ──
  @Get('reports')
  reports(@CurrentUser() user: AuthedUser) {
    return this.svc.listReports(user);
  }

  @Patch('reports/:id')
  resolveReport(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveReportSchema)) body: ResolveReportInput,
  ) {
    return this.svc.resolveReport(user, id, body);
  }

  // ── Admin yönetimi (süper admin) ──
  @Get('admins')
  admins(@CurrentUser() user: AuthedUser) {
    return this.svc.listAdmins(user);
  }

  @Post('admins')
  addAdmin(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(AddAdminSchema)) body: AddAdminInput,
  ) {
    return this.svc.addAdmin(user, body.email);
  }

  @Delete('admins/:id')
  removeAdmin(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.svc.removeAdmin(user, id);
  }

  // ── Sağlayıcılar / API ──
  @Get('providers')
  providers(@CurrentUser() user: AuthedUser) {
    return this.svc.listProviders(user);
  }

  @Patch('providers/:id')
  updateProvider(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProviderSchema)) body: UpdateProviderInput,
  ) {
    return this.svc.updateProvider(user, id, body);
  }
}
