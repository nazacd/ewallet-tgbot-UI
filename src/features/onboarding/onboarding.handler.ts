import { Markup } from 'telegraf';
import { BotContext } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import { t, Language } from '../../shared/utils/i18n';
import {
  parseTimezoneFromCity,
  parseTimezoneFromCoordinates,
  formatTimezone,
} from '../../shared/utils/geo';


/**
 * Screen 0: Language Selection
 * No explanatory текст - just pure choice
 */
export async function showLanguageSelection(ctx: BotContext) {
  const message = t('onboarding.language_prompt', 'ru'); // This message is bilingual

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(t('buttons.russian', 'ru'), 'lang_ru'),
        Markup.button.callback(t('buttons.uzbek', 'uz'), 'lang_uz'),
      ],
    ]),
  });

  await stateManager.setState(ctx.from.id, 'ONBOARDING_LANGUAGE', {
    onboardingScreen: 0,
  });
}

/**
 * Handle language selection callback
 */
export async function languageSelectionCallback(ctx: any) {
  const language = ctx.match[1] as Language; // 'ru' or 'uz'
  const userId = ctx.from.id;

  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  // Save language to state and user profile
  await apiClient.updateMe(ctx, { language_code: language });

  await stateManager.setState(userId, 'ONBOARDING_INTRO_1', {
    language,
    onboardingScreen: 1,
  });

  // Show Screen 1: Problem statement
  await showProblemStatement(ctx, language);
}

/**
 * Screen 1: Problem Statement
 */
async function showProblemStatement(ctx: any, lang: Language) {
  const message = t('onboarding.problem', lang);
  const button = t('buttons.understood', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback(button, 'onb_understood')]]),
  });
}

/**
 * Handle "understood" button from Screen 1
 */
export async function onboardingUnderstoodCallback(ctx: any) {
  const userId = ctx.from.id;
  const data = await stateManager.getData(userId);
  const lang = (data.language || 'ru') as Language;

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await stateManager.setState(userId, 'ONBOARDING_INTRO_2', {
    ...data,
    onboardingScreen: 2,
  });

  // Show Screen 2: Benefits
  await showBenefits(ctx, lang);
}

/**
 * Screen 2: Benefits & Promise
 */
async function showBenefits(ctx: any, lang: Language) {
  const message = t('onboarding.benefits', lang);
  const button = t('buttons.lets_try', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback(button, 'onb_lets_try')]]),
  });
}

/**
 * Handle "let's try" button from Screen 2
 */
export async function onboardingLetsTryCallback(ctx: any) {
  const userId = ctx.from.id;
  const data = await stateManager.getData(userId);
  const lang = (data.language || 'ru') as Language;

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await stateManager.setState(userId, 'ONBOARDING_FIRST_EXPENSE', {
    ...data,
    onboardingScreen: 3,
  });

  // Show Screen 3: First expense prompt
  await showFirstExpensePrompt(ctx, lang);
}

/**
 * Screen 3: First Expense (ACTION REQUIRED)
 */
async function showFirstExpensePrompt(ctx: any, lang: Language) {
  const message = t('onboarding.first_expense', lang);

  await ctx.reply(message, { parse_mode: 'HTML' }); // NO buttons - user must type
}

/**
 * Handle first expense text input (Tutorial - does NOT save)
 * This is called from the text handler when state is ONBOARDING_FIRST_EXPENSE
 */
export async function handleFirstExpenseInput(ctx: any, data: any) {
  const userId = ctx.from.id;
  const lang = (data.language || 'ru') as Language;
  const text = ctx.message.text;

  try {
    // Parse the expense (but don't save it!)
    const parsed = await apiClient.parseText(ctx, text);

    // Store as tutorial expense
    await stateManager.setState(userId, 'ONBOARDING_FIRST_CONFIRM', {
      ...data,
      tutorialExpense: parsed,
      onboardingScreen: 4,
    });

    // Show Screen 4: Confirmation (without balance, without saving)
    await showTutorialConfirmation(ctx, parsed, lang);
  } catch (error: any) {
    console.error('Tutorial expense parse error:', error);
    await ctx.reply(t('onboarding.errors.parse_expense', lang), { parse_mode: 'HTML' });
  }
}

/**
 * Screen 4: Tutorial Confirmation (NO SAVE, NO BALANCE)
 */
async function showTutorialConfirmation(ctx: any, parsed: any, lang: Language) {
  // Get category for display
  const categories = await apiClient.getCategories(ctx);
  const category = categories.find((c) => c.id === parsed.category_id);
  const categoryName = category ? category.name : t('onboarding.tutorial.category_other', lang);

  // Format date
  const date = parsed.performed_at || t('onboarding.tutorial.date_today', lang);

  // Static account name for tutorial
  const staticAccountName = t('onboarding.tutorial.default_account', lang);

  // Build message manually for tutorial (static format)
  const message = t('onboarding.tutorial.confirmation_message', lang, [
    parsed.amount,
    categoryName,
    staticAccountName,
    date,
  ]);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t('buttons.got_it', lang), 'onb_save_tutorial')],
    ]),
  });
}

/**
 * Handle "Понятно!" button from tutorial confirmation
 */
export async function onboardingSaveTutorialCallback(ctx: any) {
  const userId = ctx.from.id;
  const data = await stateManager.getData(userId);
  const lang = (data.language || 'ru') as Language;

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  // DON'T save the transaction - just move forward
  await stateManager.setState(userId, 'ONBOARDING_ADVANCED', {
    ...data,
    onboardingScreen: 5,
  });

  // Show Screen 5: Advanced features
  await showAdvancedFeatures(ctx, lang);
}

/**
 * Screen 5: Advanced Features
 */
async function showAdvancedFeatures(ctx: any, lang: Language) {
  const message = t('onboarding.advanced', lang);
  const button = t('buttons.got_it', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback(button, 'onb_got_it')]]),
  });
}

/**
 * Handle "got it" from Screen 5
 */
export async function onboardingGotItCallback(ctx: any) {
  const userId = ctx.from.id;
  const data = await stateManager.getData(userId);
  const lang = (data.language || 'ru') as Language;

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await stateManager.setState(userId, 'ONBOARDING_ACCOUNT_CONCEPT', {
    ...data,
    onboardingScreen: 6,
  });

  // Show Screen 6: Account concept explanation
  await showAccountConcept(ctx, lang);
}

/**
 * Screen 6: Account Concept Explanation
 */
async function showAccountConcept(ctx: any, lang: Language) {
  const message = t('onboarding.account_concept', lang);
  const button = t('buttons.lets_start', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback(button, 'onb_start_account')]]),
  });
}

/**
 * Handle "let's start" from Screen 6
 */
export async function onboardingStartAccountCallback(ctx: any) {
  const userId = ctx.from.id;
  const data = await stateManager.getData(userId);
  const lang = (data.language || 'ru') as Language;

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await stateManager.setState(userId, 'ONBOARDING_CURRENCY', {
    ...data,
    onboardingScreen: 7,
  });

  // Show Screen 7: Currency selection
  await showCurrencySelection(ctx, lang);
}

/**
 * Screen 7: Currency Selection
 */
async function showCurrencySelection(ctx: any, lang: Language) {
  const message = t('onboarding.currency_prompt', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(`🇺🇿 UZS (${t('currency.UZS', lang)})`, 'onb_curr_UZS'),
        Markup.button.callback(`🇺🇸 USD (${t('currency.USD', lang)})`, 'onb_curr_USD'),
      ],
      [
        Markup.button.callback(`🇪🇺 EUR (${t('currency.EUR', lang)})`, 'onb_curr_EUR'),
        Markup.button.callback(`🇷🇺 RUB (${t('currency.RUB', lang)})`, 'onb_curr_RUB'),
      ],
    ]),
  });
}

/**
 * Handle currency selection callback
 */
export async function currencySelectionCallback(ctx: any) {
  const currency = ctx.match[1]; // UZS, USD, EUR, RUB
  const userId = ctx.from.id;
  const data = await stateManager.getData(userId);
  const lang = (data.language || 'ru') as Language;

  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  // Save currency to user profile
  await apiClient.updateMe(ctx, { currency_code: currency });

  await stateManager.setState(userId, 'ONBOARDING_ACCOUNT_NAME', {
    ...data,
    accountData: { currency },
    onboardingScreen: 8,
  });

  // Show Screen 8: Account name prompt
  await showAccountNamePrompt(ctx, lang);
}

/**
 * Screen 8: Account Name Input
 */
async function showAccountNamePrompt(ctx: any, lang: Language) {
  const message = t('onboarding.account_name', lang);
  await ctx.reply(message, {
    parse_mode: 'HTML',
  }); // NO buttons - user must type
}

/**
 * Handle account name input
 */
export async function handleAccountNameInput(ctx: any, data: any) {
  const userId = ctx.from.id;
  const lang = (data.language || 'ru') as Language;
  const accountName = ctx.message.text.trim();

  if (!accountName || accountName.length > 50) {
    await ctx.reply(t('validation.account_name_length', lang));
    return;
  }

  await stateManager.setState(userId, 'ONBOARDING_ACCOUNT_BALANCE', {
    ...data,
    accountData: { ...data.accountData, name: accountName },
    onboardingScreen: 9,
  });

  // Show Screen 9: Balance prompt
  await showBalancePrompt(ctx, lang);
}

/**
 * Screen 9: Initial Balance Input
 */
async function showBalancePrompt(ctx: any, lang: Language) {
  const message = t('onboarding.balance_prompt', lang);
  await ctx.reply(message, {
    parse_mode: 'HTML',
  }); // NO buttons - user must type
}

/**
 * Handle balance input
 */
export async function handleBalanceInput(ctx: any, data: any) {
  const userId = ctx.from.id;
  const lang = (data.language || 'ru') as Language;
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply(t('validation.invalid_balance', lang));
    return;
  }

  await stateManager.setState(userId, 'ONBOARDING_TIMEZONE', {
    ...data,
    accountData: { ...data.accountData, balance },
    onboardingScreen: 10,
  });

  // Show Screen 10: Timezone selection
  await showTimezoneSelection(ctx, lang);
}

/**
 * Screen 10: Timezone Selection
 */
async function showTimezoneSelection(ctx: any, lang: Language) {
  const message = t('onboarding.timezone_prompt', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.keyboard([[Markup.button.locationRequest(t('buttons.send_location', lang))]])
      .resize()
      .oneTime(),
  });
}

/**
 * Handle timezone selection callback
 */

/**
 * Handle timezone from city name (text input during ONBOARDING_TIMEZONE)
 */
export async function handleTimezoneTextInput(ctx: any, data: any) {
  const userId = ctx.from.id;
  const lang = (data.language || 'ru') as Language;
  const cityName = ctx.message.text.trim();

  const timezone = parseTimezoneFromCity(cityName);

  if (!timezone) {
    await ctx.reply(t('onboarding.errors.city_not_found', lang));
    return;
  }

  // Save timezone to user profile
  await apiClient.updateMe(ctx, { timezone: timezone.name });

  // Remove keyboard
  const processingMsg = await ctx.reply(t('transaction.loading', lang), {
    parse_mode: 'HTML',
    ...Markup.removeKeyboard(),
  });

  await stateManager.setState(userId, 'ONBOARDING_COMPLETE', {
    ...data,
    onboardingScreen: 11,
  });

  await ctx.deleteMessage(processingMsg.message_id).catch(() => { });

  // Show Screen 11: Create account and complete
  await completeOnboarding(ctx, data, lang, timezone.name);
}

/**
 * Handle timezone from geolocation (location message during ONBOARDING_TIMEZONE)
 */
export async function handleTimezoneGeolocation(ctx: any, data: any) {
  const userId = ctx.from.id;
  const lang = (data.language || 'ru') as Language;
  const location = ctx.message.location;

  const timezone = parseTimezoneFromCoordinates(location.latitude, location.longitude);

  // Save timezone to user profile
  await apiClient.updateMe(ctx, { timezone: timezone.name });

  // Remove keyboard
  const processingMsg = await ctx.reply(t('transaction.loading', lang), {
    parse_mode: 'HTML',
    ...Markup.removeKeyboard(),
  });

  await stateManager.setState(userId, 'ONBOARDING_COMPLETE', {
    ...data,
    onboardingScreen: 11,
  });

  await ctx.deleteMessage(processingMsg.message_id).catch(() => { });

  // Show Screen 11: Create account and complete
  await completeOnboarding(ctx, data, lang, timezone.name);
}

/**
 * Screen 11: Create account and complete onboarding
 */
async function completeOnboarding(ctx: any, data: any, lang: Language, timezone: string) {
  const userId = ctx.from.id;
  const { currency, name, balance } = data.accountData || {};

  try {
    // Create the account
    await apiClient.createAccount(ctx, {
      name: name || t('onboarding.tutorial.default_account', lang),
      balance: balance || 0,
      is_default: true,
    });

    // Show completion message
    const message = t('onboarding.completion', lang, [
      name || t('onboarding.tutorial.default_account', lang),
      `${balance || 0}`,
      currency || 'UZS',
      timezone,
    ]);

    // Clear onboarding state immediately
    await stateManager.clearState(userId);

    // Get Main Menu keyboard
    const { buildReplyKeyboard } = await import('../menu/menu.handler');
    const keyboard = buildReplyKeyboard(lang);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard,
    });
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply(t('onboarding.errors.account_creation', lang));
    await stateManager.clearState(userId);
  }
}

/**
 * Start account onboarding for users who skipped initial onboarding
 * Begins from Screen 6 (Account Concept)
 */
export async function startAccountOnboarding(ctx: BotContext) {
  try {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    const userId = ctx.from.id;

    // Show explanatory message first
    await ctx.reply(t('onboarding.need_account', lang), {
      parse_mode: 'HTML',
    });

    // Set state to Account Concept screen
    await stateManager.setState(userId, 'ONBOARDING_ACCOUNT_CONCEPT', {
      language: lang,
      onboardingScreen: 6,
    });

    // Show Screen 6: Account concept explanation
    await showAccountConcept(ctx, lang);
  } catch (error: any) {
    console.error('Start account onboarding error:', error);
    const lang = 'ru';
    await ctx.reply(t('errors.critical', lang));
  }
}

// Register all state handlers
stateManager.register('ONBOARDING_FIRST_EXPENSE', handleFirstExpenseInput);
stateManager.register('ONBOARDING_ACCOUNT_NAME', handleAccountNameInput);
stateManager.register('ONBOARDING_ACCOUNT_BALANCE', handleBalanceInput);
stateManager.register('ONBOARDING_TIMEZONE', handleTimezoneTextInput);
