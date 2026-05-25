import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';
import { ListsService } from '../lists/lists.service.js';
import type { EventsBatchInput } from './dto.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(SUPABASE) private readonly sb: SupabaseClient,
    private readonly lists: ListsService,
  ) {}

  /** Batch engagement: like/unlike/save yan etkileri + tüm event'leri append. */
  async record(userId: string, events: EventsBatchInput['events']): Promise<{ count: number }> {
    for (const e of events) {
      try {
        if (e.event_type === 'like') {
          await this.sb
            .from('likes')
            .upsert(
              { user_id: userId, listing_id: e.listing_id },
              { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
            );
        } else if (e.event_type === 'unlike') {
          await this.sb.from('likes').delete().eq('user_id', userId).eq('listing_id', e.listing_id);
        } else if (e.event_type === 'save') {
          await this.lists.addFavorite(userId, e.listing_id);
        }
      } catch (err) {
        this.logger.warn(`event side-effect ${e.event_type} failed: ${(err as Error).message}`);
      }
    }

    const rows = events.map((e) => ({
      user_id: userId,
      listing_id: e.listing_id,
      event_type: e.event_type,
      dwell_ms: e.dwell_ms ?? null,
      position: e.position ?? null,
    }));
    const { error } = await this.sb.from('engagement_events').insert(rows);
    if (error) this.logger.warn(`engagement insert failed: ${error.message}`);
    return { count: rows.length };
  }
}
