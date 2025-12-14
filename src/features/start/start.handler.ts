import { BotContext } from '../../core/types';
import { authService } from '../../services/auth.service';
import { apiClient } from '../../services/api.client';
import { showLanguageSelection } from '../onboarding/onboarding.handler';
import { showMainMenu } from '../menu/menu.handler';
import { Language, t } from '../../shared/utils/i18n';

/**
 * /start command handler
 *
 * New flow:
 * - New users (no language set): Start onboarding at Screen 0
 * - Existing users: Show ReplyKeyboard main menu
 */
export async function startHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    // Authenticate user
    await authService.ensureToken(tgUserId, {
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      username: ctx.from.username,
      language_code: ctx.from.language_code,
    });

    // Get user info
    const user = await apiClient.getMe(ctx);

    // Check if user needs onboarding (no language set)
    if (!user.language_code) {
      // New user - start onboarding from Screen 0
      await showLanguageSelection(ctx);
    } else {
      // Existing user - show main menu with ReplyKeyboard
      const lang = (user.language_code as Language) || 'ru';
      await showMainMenu(ctx, lang, true);
    }
  } catch (error: any) {
    console.error('Start handler error:', error);
    await ctx.reply(t('start.error', 'ru'));
  }
}
