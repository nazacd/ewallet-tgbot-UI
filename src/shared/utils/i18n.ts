export type Language = 'ru' | 'uz';

export const messages = {
  ru: {
    onboarding: {
      language_prompt: '🌍 Выберите язык / Tilni tanlang',

      problem: `💸 <b>Знакомая ситуация?</b>

Деньги уходят — а куда непонятно.
Чеки теряются, заметки забываются, таблицы неудобны.`,

      benefits: `✨ <b>Я помогу тебе видеть:</b>

💰 Сколько ты реально тратишь
📊 Куда уходит больше всего
✅ Сколько остаётся

<i>Без таблиц. Без ручного учёта.</i>

⏱ Большинство людей бросают учёт через 7 дней.
Поэтому мы сделали его одним сообщением.`,

      first_expense: `📝 <b>Попробуй прямо сейчас</b>

Напиши любой расход простым текстом:

<code>Кофе 18 000</code>
<code>Такси 25к</code>

Не бойся ошибиться — я подскажу! 😊`,

      advanced: `💡 <b>Можно точнее:</b>

📅 Указать дату: <i>вчера</i>, <i>10 мая</i>
💳 Указать счёт: <i>наличные</i>, <i>карта</i>
📝 Добавить комментарий

<b>Пример:</b>
<code>Такси 25 000 вчера с карты</code>`,

      account_concept: `💼 <b>Что такое «счета»?</b>

У тебя могут быть разные источники денег:

💵 Наличные в кошельке
💳 Банковская карта
🏦 Накопительный счёт
💰 Электронный кошелёк

Мы будем называть их «счетами» — так ты увидишь, сколько где лежит.`,

      currency_prompt: '💱 <b>Выбери валюту:</b>',

      account_name: `📊 <b>Название счёта</b>

Как назовём твой первый счёт?

<b>Примеры:</b>
• Наличные
• Основная карта
• Humo
• Кошелёк`,

      balance_prompt: `💰 <b>Текущий баланс</b>

Сколько сейчас на этом счёте?

Введи число (или 0, если начинаешь с нуля).`,

      timezone_prompt: `🕐 <b>Часовой пояс</b>

Чтобы лучше подстроиться, выбери часовой пояс.

Напиши название города или отправь геолокацию 📍`,

      completion: (accountName: string, balance: string, currency: string, timezone: string) =>
        `✅ <b>Всё готово!</b>

📊 Счёт: <b>${accountName}</b>
💰 Баланс: <b>${balance} ${currency}</b>
🕐 Часовой пояс: ${timezone}

Теперь просто напиши или отправь голосовое сообщение! 🎤`,

      errors: {
        parse_expense: '🤔 Попробуй так: <code>Кофе 5000</code>',
        city_not_found: '🤔 Город не найден. Попробуй другой или выбери из кнопок.',
        account_creation: '❌ Ошибка создания счёта. Попробуй /start заново.',
      },

      need_account: `💼 <b>Сначала создадим счёт</b>

Чтобы начать учёт, нужен хотя бы один счёт для хранения денег.`,

      tutorial: {
        category_other: 'Прочее',
        date_today: 'сегодня',
        default_account: 'Основной счет',
        confirmation_message: (amount: number, categoryName: string, accountName: string, date: string) =>
          `✅ <b>Понял!</b>

💰 Расход: <b>${amount} сум</b>
📁 Категория: ${categoryName}
📊 Счёт: ${accountName}
📅 Дата: ${date}`,
      },
    },

    buttons: {
      russian: '🇷🇺 Русский',
      uzbek: "🇺🇿 O'zbekcha",

      understood: 'Это про меня 👉',
      lets_try: 'Давай попробуем ✨',
      save: '✅ Сохранить',
      edit: '✏️ Изменить',
      got_it: 'Понятно 👌',
      lets_start: 'Начнём! 🚀',
      start_using: '🚀 Начать пользоваться',

      close: '✖️ Закрыть',
      back: '◀️ Назад',
      send_location: '📍 Моя геолокация',
    },

    menu: {
      accounts: '📊 Счета',
      transaction: '➕ Добавить',
      history: '📜 История',
      stats: '📈 Статистика',
      debts: '💳 Долги',
      settings: '⚙️ Настройки',
      main_prompt: '🏠 <b>Главное меню</b>',
      add_transaction_help: `➕ <b>Добавить транзакцию</b>

Отправь текст ✏️, голос 🎤 или фото чека 📸

<b>📝 Примеры:</b>
• Кофе 5000
• Ужин 50000
• Зарплата 5000000`,
      history_prompt: `Просмотрите полную историю всех ваших транзакций.

💡 <i>В приложении доступны фильтры по датам, категориям, счетам и поиск по тексту.</i>`,
      stats_prompt: `Анализируйте свои финансы с помощью наглядных графиков и диаграмм.

💡 <i>Выбирайте период, фильтруйте по счетам и отслеживайте категории расходов.</i>`,
      debts_prompt: `Управляйте вашими долгами и займами.

💡 <i>Отслеживайте кому вы одолжили и у кого заняли, получайте напоминания о сроках.</i>`,
      accounts_prompt: `Управляйте своими счетами и балансами.

💡 <i>Создавайте счета, отслеживайте балансы и переключайтесь между ними.</i>`,
      settings_prompt: `Настройте параметры приложения.

💡 <i>Измените валюту, часовой пояс и счёт по умолчанию.</i>`,
      open_webapp: '📱 Открыть приложение',
    },

    settings: {
      title: '⚙️ <b>Настройки</b>',
      current_currency: '💱 Текущая валюта',
      default_account: '📊 Счёт по умолчанию',
      not_set: 'Не установлен',
      change_currency: '💱 Сменить валюту',
      change_default_account: '📊 Счёт по умолчанию',
      back_to_menu: '◀️ В меню',
      back_to_settings: '◀️ К настройкам',
      choose_currency: '💱 <b>Выбор валюты</b>\n\nВыбери валюту для новых счетов:',
      currency_changed: (currency: string) =>
        `✅ Валюта изменена на <b>${currency}</b>\n\n💡 Существующие счета сохранят свою валюту.`,
      currency_change_error: '❌ Не удалось изменить валюту',
      no_accounts: '❌ У тебя нет счетов. Создай первый через /start',
      choose_account: '📊 <b>Счёт по умолчанию</b>\n\nВыбери основной счёт:',
      account_changed: '✅ Счёт по умолчанию изменён',
      account_change_error: '❌ Не удалось изменить счёт',

      timezone: '🌍 Часовой пояс',
      change_timezone: '🌍 Изменить часовой пояс',
      timezone_current: (tz: string) => `🕐 <b>Текущий часовой пояс:</b> ${tz}`,
      timezone_prompt: `🕐 <b>Часовой пояс</b>\n\nНапиши название города или отправь геолокацию 📍`,
      timezone_updated: (tz: string) => `✅ Часовой пояс изменён на <b>${tz}</b>`,
      timezone_change_error: '❌ Не удалось изменить часовой пояс',
    },

    start: {
      error: '❌ Что-то пошло не так. Попробуй ещё раз.',
    },

    stats: {
      title: '📈 <b>Статистика</b>',
      no_transactions: `📊 <b>Пока пусто</b>

Добавь несколько транзакций или выбери другой период.`,

      expenses_by_category: '💸 <b>Расходы по категориям</b>',
      income_by_category: '💰 <b>Доходы по категориям</b>',
      other: 'Прочее',
      total_expenses: '💸 Всего расходов',
      total_income: '💰 Всего доходов',
      balance: '📊 Баланс',
      expenses_title: '💸 Расходы',
      income_title: '💰 Доходы',
      error: '❌ Не удалось загрузить статистику',

      periods: {
        month: 'Месяц',
        week: 'Неделя',
        day: 'День',
        all: '🗓️ Всё время',
      },

      change_account: '🔄 Сменить счёт',
      back_to_menu: '◀️ В меню',

      months: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ],

      selection: {
        no_accounts: '❌ Нет счетов. Создай первый через /start',
        overall: '📊 Общая статистика',
        message: '📈 <b>Статистика</b>\n\nВыбери счёт или посмотри общую статистику:',
        error: '❌ Не удалось загрузить счета',
      },
    },

    accounts: {
      no_accounts: `📊 <b>Счетов пока нет</b>

Создай первый счёт, чтобы начать учёт финансов.`,

      create_button: '➕ Создать счёт',
      your_accounts: '📊 <b>Твои счета:</b>\n\n',
      add_button: '➕ Добавить счёт',
      manage_button: '📝 Управление',
      error_load: '❌ Не удалось загрузить счета',

      create_step_name: '📝 <b>Название счёта</b>',
      create_step_name_prompt: 'Как его назовём?\n\n<b>Примеры:</b> Сбережения, Кредитка, Наличные',
      name_invalid: '❌ Введи корректное имя (до 50 символов)',

      create_step_balance: '💰 <b>Начальный баланс</b>',
      create_step_balance_prompt: (name: string, currency: string) =>
        `Отлично! Сколько сейчас на <b>${name}</b>?\n\nВведи число в ${currency} (или 0)`,
      balance_invalid: '❌ Введи корректное число (0 или больше)',

      error_generic: '❌ Что-то пошло не так. Попробуй /accounts заново',

      created_success: (name: string, balance: string) =>
        `✅ <b>Счёт создан!</b>

📊 ${name}
💰 Баланс: <b>${balance}</b>

💡 Теперь можешь добавить транзакцию:
<code>Кофе 5000</code>`,

      error_create: '❌ Не удалось создать счёт',
      manage_prompt: '📝 <b>Управление счетами</b>\n\nВыбери счёт:',
      not_found: '❌ Счёт не найден',

      is_default: '⭐️ Основной',
      make_default: '⭐️ Сделать основным',
      delete: '🗑 Удалить счёт',

      error_details: '❌ Не удалось загрузить счёт',
      setting_default: '⏳ Устанавливаю...',
      set_default_success: (name: string) => `✅ <b>${name}</b> теперь основной счёт!`,
      back_to_accounts: '◀️ К счетам',
      error_update: '❌ Не удалось обновить счёт',

      delete_confirm_prompt: `⚠️ <b>Удалить счёт?</b>

Все связанные транзакции тоже будут удалены.
Это действие необратимо!`,

      delete_confirm_yes: '✅ Да, удалить',
      deleting: '⏳ Удаляю...',
      delete_success: '✅ Счёт удалён',
      error_delete: '❌ Не удалось удалить счёт',
    },

    history: {
      no_transactions: `📜 <b>История пуста</b>

Добавь первую транзакцию:
<code>Кофе 5000</code>`,

      error_load: '❌ Не удалось загрузить историю',
      title: '📜 <b>История транзакций</b>',

      summary_month: 'Итоги за месяц',
      income: '➕ Доход',
      expense: '➖ Расход',

      page_info: (current: number, total: number) => `Страница ${current} из ${total}`,

      today: 'Сегодня',
      yesterday: 'Вчера',
      other: 'Прочее',
      account: 'Счёт',

      hint: '💡 Листай историю кнопками ниже',
      outdated: '⚠️ История устарела. Используй /history',
      not_found: '❌ Транзакция не найдена',
      unknown: 'Неизвестно',

      details_title: (num: string) => `🔍 <b>Транзакция #${num}</b>`,
      type: 'Тип',
      amount: 'Сумма',
      category: 'Категория',
      date: 'Дата',
      note: 'Комментарий',

      back_to_history: '◀️ К истории',
      delete: '🗑 Удалить',
      delete_confirm: '⚠️ Вы уверены, что хотите удалить эту транзакцию?',
      delete_success: '✅ Транзакция удалена',
      delete_error: '❌ Не удалось удалить транзакцию',
      delete_yes: '✅ Да, удалить',
      delete_cancel: '❌ Отмена',
      open_webapp: '📱 Открыть в приложении',
    },

    currency: {
      UZS: 'сум',
      USD: 'доллар',
      EUR: 'евро',
      RUB: 'рубль',
    },

    validation: {
      account_name_length: 'Название должно быть от 1 до 50 символов',
      invalid_balance: 'Введи корректное число (0 или больше)',
    },

    transaction: {
      loading: '🤖 Анализирую...',
      new_deposit: '💰 <b>Новый доход</b>',
      new_expense: '💸 <b>Новый расход</b>',

      amount: 'Сумма',
      category: 'Категория',
      account: 'Счёт',
      note: 'Комментарий',
      date: 'Дата',

      confidence_warning: '⚠️ Не уверен в распознавании. Проверь данные!',
      save_error: '❌ Не удалось сохранить транзакцию',
      outdated: '⚠️ Данные устарели. Попробуй заново',
      account_not_found: '❌ Счёт не найден',
      category_not_found: '❌ Категория не найдена',

      saved: '✅ Транзакция сохранена!',
      deleted: '🗑 Транзакция удалена!',
      canceled: '❌ Транзакция отменена',
      delete: '🗑 Удалить',
      delete_confirm: '⚠️ Вы уверены, что хотите удалить эту транзакцию?',
      delete_success: '✅ Транзакция удалена',
      delete_error: '❌ Не удалось удалить транзакцию',

      account_balance: 'Баланс',
      category_updated: '✅ Категория обновлена',
      account_updated: '✅ Счёт обновлён',
      amount_updated: '✅ Сумма обновлена',

      invalid_amount: '❌ Введи положительное число',

      choose_category: '📁 <b>Выбери категорию:</b>',
      choose_account: '📊 <b>Выбери счёт:</b>',

      no_accounts_found: `❌ <b>Нет счетов</b>

Создай хотя бы один счёт через /start в разделе «Счета».`,

      parse_error: `🤔 <b>Не понял</b>

Попробуй так:
• <code>Кофе 5000</code>
• <code>Обед 25000</code>
• <code>Зарплата 5000000</code>`,

      editInWebApp: 'Нажмите ниже, чтобы отредактировать в приложении:',
      openEditor: '✏️ Открыть редактор'
    },

    confirmation: {
      edit: '✏️ Изменить',
      edit_more: '✏️ Ещё',
      confirm: '✅ Сохранить',
      cancel: '❌ Отменить',
    },

    debt: {
      detection_message_borrowed: `💰 <b>Обнаружен долг!</b>

Вы заняли деньги. Хотите отслеживать это?`,

      detection_message_lent: `💰 <b>Обнаружен долг!</b>

Вы одолжили деньги. Хотите отслеживать это?`,

      yes_track: '✅ Да, отслеживать',
      no_track: '❌ Нет, не нужно',

      confirmation_title: '📋 Подтверждение долга',
      type: 'Тип',
      type_borrow: '💸 Я занял(а)',
      type_lend: '💰 Я одолжил(а)',
      from_whom: 'От кого',
      to_whom: 'Кому',
      counterparty: 'Контрагент',
      amount: 'Сумма',
      due_date: 'Срок возврата',
      remind: 'Напомнить',
      note: 'Примечание',

      remind_in_3d: 'через 3 дня',
      remind_in_1w: 'через 1 неделю',
      remind_in_2w: 'через 2 недели',
      remind_in_1m: 'через 1 месяц',

      confirm: '✅ Подтвердить',
      cancel: '❌ Отменить',
      edit_due_date: '📅 Изменить срок',

      choose_due_date: '📅 <b>Выберите срок напоминания:</b>',
      interval_3d: '3 дня',
      interval_1w: '1 неделя',
      interval_2w: '2 недели',
      interval_1m: '1 месяц',

      created: '✅ Долг сохранён!',
      rejected: '❌ Отслеживание отменено',
      canceled: '❌ Создание долга отменено',

      paid: '✅ Оплачено',
      remind_later: '🔔 Напомнить позже',
      action_cancel: '❌ Отменить долг',
      marked_paid: '✅ Долг отмечен как оплаченный!',
      reminder_scheduled: '🔔 Напоминание перенесено.',
      debt_canceled: '❌ Долг отменён.',
      action_error: '❌ Не удалось выполнить действие. Попробуйте снова.',

      outdated: '⚠️ Данные устарели. Попробуйте снова.',
      parse_error: '❌ Не удалось распознать долг. Попробуйте снова.',
      create_error: '❌ Не удалось создать долг. Попробуйте снова.',
    },

    errors: {
      retry_hint: '💡 Попробуй ещё раз или используй /start для обновления',
      critical: '❌ Критическая ошибка. Напиши @AsaHero для поддержки.',
    },
  },

  uz: {
    onboarding: {
      language_prompt: '🌍 Tilni tanlang / Выберите язык',

      problem: `💸 <b>Tanish vaziyat?</b>

Pul tugaydi — lekin qayerga ketganini bilmaysiz.
Cheklar yo'qoladi, eslatmalar unutiladi, jadvallar noqulay.`,

      benefits: `✨ <b>Men sizga ko'rsataman:</b>

💰 Qancha sarflayotganingizni
📊 Qayerga ko'p ketayotganini
✅ Qancha qolayotganini

<i>Jadvalsiz. Qo'lda hisoblashsiz.</i>

⏱ Ko'pchilik 7 kundan keyin tashlaydi.
Shuning uchun bitta xabar bilan qildik.`,

      first_expense: `📝 <b>Hoziroq sinab ko'ring</b>

Oddiy matn bilan xarajatni yozing:

<code>Kofe 18 000</code>
<code>Taksi 25 ming</code>

Xato qilishdan qo'rqmang — yordam beraman! 😊`,

      advanced: `💡 <b>Aniqroq bo'lishi mumkin:</b>

📅 Sana: <i>kecha</i>, <i>10-may</i>
💳 Hisob: <i>naqd</i>, <i>karta</i>
📝 Izoh qo'shish

<b>Misol:</b>
<code>Taksi 25 000 kecha kartadan</code>`,

      account_concept: `💼 <b>«Hisoblar» nima?</b>

Pulning turli manbalari bo'lishi mumkin:

💵 Hamyondagi naqd pul
💳 Bank kartasi
🏦 Jamg'arma hisobi
💰 Elektron hamyon

Bularni «hisoblar» deb ataymiz — qayerda qancha borligini ko'rasiz.`,

      currency_prompt: '💱 <b>Valyutani tanlang:</b>',

      account_name: `📊 <b>Hisob nomi</b>

Birinchi hisobingizni qanday nomlaymiz?

<b>Misollar:</b>
• Naqd pul
• Asosiy karta
• Humo
• Hamyon`,

      balance_prompt: `💰 <b>Joriy balans</b>

Hozir bu hisobda qancha pul bor?

Raqam kiriting (yoki 0, agar noldan boshlasangiz).`,

      timezone_prompt: `🕐 <b>Vaqt mintaqasi</b>

Yaxshiroq sozlash uchun vaqt mintaqasini tanlang.

Shahar nomini yozing yoki geolokatsiya yuboring 📍`,

      completion: (accountName: string, balance: string, currency: string, timezone: string) =>
        `✅ <b>Hammasi tayyor!</b>

📊 Hisob: <b>${accountName}</b>
💰 Balans: <b>${balance} ${currency}</b>
🕐 Vaqt mintaqasi: ${timezone}

Endi shunchaki yozing yoki ovozli xabar yuboring! 🎤`,

      errors: {
        parse_expense: `🤔 Buni sinab ko'ring: <code>Kofe 5000</code>`,
        city_not_found: '🤔 Shahar topilmadi. Boshqasini yozing yoki tugmalardan tanlang.',
        account_creation: '❌ Hisob yaratishda xatolik. /start ni qayta bosing.',
      },

      need_account: `💼 <b>Avval hisob yaratamiz</b>\n\nHisobni boshlash uchun kamida bitta hisob kerak.`,

      tutorial: {
        category_other: 'Boshqa',
        date_today: 'bugun',
        default_account: 'Asosiy hisob',
        confirmation_message: (amount: number, categoryName: string, accountName: string, date: string) =>
          `✅ <b>Tushundim!</b>

💰 Xarajat: <b>${amount} so'm</b>
📁 Kategoriya: ${categoryName}
📊 Hisob: ${accountName}
📅 Sana: ${date}`,
      },
    },

    buttons: {
      russian: '🇷🇺 Русский',
      uzbek: "🇺🇿 O'zbekcha",

      understood: 'Bu men haqimda 👉',
      lets_try: `Sinab ko'raylik ✨`,
      save: '✅ Saqlash',
      edit: '✏️ Tahrirlash',
      got_it: 'Tushundim 👌',
      lets_start: 'Boshlaymiz! 🚀',
      start_using: '🚀 Ishlatishni boshlash',
      close: '✖️ Yopish',
      back: '◀️ Orqaga',
      send_location: '📍 Mening lokatsiyam',
    },

    menu: {
      accounts: '📊 Hisoblar',
      transaction: `➕ Qo\'shish`,
      history: '📜 Tarix',
      stats: '📈 Statistika',
      debts: '💳 Qarzlar',
      settings: '⚙️ Sozlamalar',
      main_prompt: '🏠 <b>Asosiy menyu</b>',
      add_transaction_help: `➕ <b>Tranzaksiya qo'shish</b>

Matn ✏️, ovoz 🎤 yoki chek rasmi 📸 yuboring

<b>📝 Misollar:</b>
• Kofe 5000
• Kechki ovqat 50000
• Oylik 5000000`,
      history_prompt: `Barcha tranzaksiyalaringizning to'liq tarixini ko'ring.

💡 <i>Ilovada sanalar, kategoriyalar, hisoblar bo'yicha filtrlar va matn qidiruvi mavjud.</i>`,
      stats_prompt: `Moliyaviy holatni aniq grafiklar va diagrammalar yordamida tahlil qiling.

💡 <i>Davr tanlang, hisoblar bo'yicha filtrlang va xarajat kategoriyalarini kuzating.</i>`,
      debts_prompt: `Qarzlaringiz va qarz berganlaringizni boshqaring.

💡 <i>Kimga qarz berganingiz va kimdan qarz olganingizni kuzating, muddatlar haqida eslatmalar oling.</i>`,
      accounts_prompt: `Hisoblaringiz va balanlaringizni boshqaring.

💡 <i>Hisoblar yarating, balanslarni kuzating va ular orasida almashinish.</i>`,
      settings_prompt: `Ilova sozlamalarini sozlang.

💡 <i>Valyuta, vaqt mintaqasi va asosiy hisobni o'zgartiring.</i>`,
      open_webapp: '📱 Ilovani ochish',
    },

    settings: {
      title: '⚙️ <b>Sozlamalar</b>',
      current_currency: '💱 Joriy valyuta',
      default_account: '📊 Asosiy hisob',
      not_set: `O'rnatilmagan`,
      change_currency: `💱 Valyutani o'zgartirish`,
      change_default_account: '📊 Asosiy hisob',
      back_to_menu: '◀️ Menyuga',
      back_to_settings: '◀️ Sozlamalarga',
      choose_currency: '💱 <b>Valyutani tanlash</b>\n\nYangi hisoblar uchun valyutani tanlang:',
      currency_changed: (currency: string) =>
        `✅ Valyuta <b>${currency}</b> ga o'zgartirildi\n\n💡 Mavjud hisoblar valyutasi saqlanadi.`,
      currency_change_error: `❌ Valyutani o'zgartirib bo'lmadi`,
      no_accounts: `❌ Hisoblar yo'q. /start orqali yarating`,
      choose_account: '📊 <b>Asosiy hisob</b>\n\nAsosiy hisobni tanlang:',
      account_changed: `✅ Asosiy hisob o'zgartirildi`,
      account_change_error: `❌ Hisobni o'zgartirib bo'lmadi`,

      timezone: '🌍 Vaqt mintaqasi',
      change_timezone: `🌍 Vaqt mintaqasini o'zgartirish`,
      timezone_current: (tz: string) => `🕐 <b>Joriy vaqt mintaqasi:</b> ${tz}`,
      timezone_prompt: `🕐 <b>Vaqt mintaqasi</b>\n\nShahar nomini yozing yoki geolokatsiya yuboring 📍`,
      timezone_updated: (tz: string) => `✅ Vaqt mintaqasi <b>${tz}</b> ga o'zgartirildi`,
      timezone_change_error: `❌ Vaqt mintaqasini o'zgartirib bo'lmadi`,
    },

    start: {
      error: `❌ Nimadir xato ketdi. Qayta urinib ko'ring.`,
    },

    stats: {
      title: '📈 <b>Statistika</b>',
      no_transactions: `📊 <b>Hali bo'sh</b>

Bir nechta tranzaksiya qo'shing yoki boshqa davr tanlang.`,

      expenses_by_category: `💸 <b>Xarajatlar (kategoriya bo'yicha)</b>`,
      income_by_category: `💰 <b>Daromadlar (kategoriya bo'yicha)</b>`,
      other: 'Boshqa',
      total_expenses: '💸 Jami xarajatlar',
      total_income: '💰 Jami daromadlar',
      balance: '📊 Balans',
      expenses_title: '💸 Xarajatlar',
      income_title: '💰 Daromadlar',
      error: `❌ Statistikani yuklab bo'lmadi`,

      periods: {
        month: 'Oy',
        week: 'Hafta',
        day: 'Kun',
        all: '🗓️ Barcha vaqt',
      },

      change_account: '🔄 Hisobni almashtirish',
      back_to_menu: '◀️ Menyuga',

      months: [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
      ],

      selection: {
        no_accounts: `❌ Hisoblar yo'q. /start orqali yarating`,
        overall: '📊 Umumiy statistika',
        message: `📈 <b>Statistika</b>\n\nHisobni tanlang yoki umumiy statistikani ko'ring:`,
        error: `❌ Hisoblarni yuklab bo'lmadi`,
      },
    },

    accounts: {
      no_accounts: `📊 <b>Hisoblar hali yo'q</b>

Birinchi hisobni yarating va hisobni boshlang.`,

      create_button: `➕ Hisob yaratish`,
      your_accounts: `📊 <b>Sizning hisoblaringiz:</b>\n\n`,
      add_button: `➕ Hisob qo'shish`,
      manage_button: `📝 Boshqarish`,
      error_load: `❌ Hisoblarni yuklab bo'lmadi`,

      create_step_name: `📝 <b>Hisob nomi</b>`,
      create_step_name_prompt: `Qanday nomlaymiz?\n\n<b>Misollar:</b> Jamg'arma, Kredit karta, Naqd`,
      name_invalid: `❌ To'g'ri nom kiriting (50 belgigacha)`,

      create_step_balance: `💰 <b>Boshlang'ich balans</b>`,
      create_step_balance_prompt: (name: string, currency: string) =>
        `Zo'r! <b>${name}</b> da hozir qancha bor?\n\n${currency} da raqam kiriting (yoki 0)`,
      balance_invalid: `❌ To'g'ri raqam kiriting (0 yoki ko'proq)`,

      error_generic: '❌ Nimadir xato ketdi. /accounts ni qayta bosing',

      created_success: (name: string, balance: string) =>
        `✅ <b>Hisob yaratildi!</b>

📊 ${name}
💰 Balans: <b>${balance}</b>

💡 Endi tranzaksiya qo'shishingiz mumkin:
<code>Kofe 5000</code>`,

      error_create: `❌ Hisob yaratib bo'lmadi`,
      manage_prompt: `📝 <b>Hisoblarni boshqarish</b>\n\nHisobni tanlang:`,
      not_found: `❌ Hisob topilmadi`,

      is_default: '⭐️ Asosiy',
      make_default: '⭐️ Asosiy qilish',
      delete: `🗑 Hisobni o'chirish`,

      error_details: `❌ Hisobni yuklab bo'lmadi`,
      setting_default: `⏳ O'rnatyapman...`,
      set_default_success: (name: string) => `✅ <b>${name}</b> endi asosiy hisob!`,
      back_to_accounts: '◀️ Hisoblarga',
      error_update: `❌ Hisobni yangilab bo'lmadi`,

      delete_confirm_prompt: `⚠️ <b>Hisobni o'chirish?</b>

Barcha bog'liq tranzaksiyalar ham o'chiriladi.
Bu harakat qaytarib bo'lmaydi!`,

      delete_confirm_yes: `✅ Ha, o'chirish`,
      deleting: `⏳ O'chiryapman...`,
      delete_success: `✅ Hisob o'chirildi`,
      error_delete: `❌ Hisobni o'chirib bo'lmadi`,
    },

    history: {
      no_transactions: `📜 <b>Tarix bo'sh</b>

Birinchi tranzaksiyani qo'shing:
<code>Kofe 5000</code>`,

      error_load: `❌ Tarixni yuklab bo'lmadi`,
      title: '📜 <b>Tranzaksiyalar tarixi</b>',

      summary_month: 'Oy yakunlari',
      income: '➕ Daromad',
      expense: '➖ Xarajat',

      page_info: (current: number, total: number) => `${current}-sahifa (${total} ta)`,

      today: 'Bugun',
      yesterday: 'Kecha',
      other: 'Boshqa',
      account: 'Hisob',

      hint: '💡 Tugmalar bilan sahifalarni almashtiring',
      outdated: '⚠️ Tarix eskirgan. /history ni ishlating',
      not_found: '❌ Tranzaksiya topilmadi',
      unknown: `Noma'lum`,

      details_title: (num: string) => `🔍 <b>Tranzaksiya #${num}</b>`,
      type: 'Turi',
      amount: 'Miqdor',
      category: 'Kategoriya',
      date: 'Sana',
      note: 'Izoh',

      back_to_history: '◀️ Tarixga',
      delete: '🗑 O\'chirish',
      delete_confirm: '⚠️ Ushbu tranzaksiyani o\'chirmoqchimisiz?',
      delete_success: '✅ Tranzaksiya o\'chirildi',
      delete_error: '❌ Tranzaksiyani o\'chirib bo\'lmadi',
      delete_yes: '✅ Ha, o\'chirish',
      delete_cancel: '❌ Bekor qilish',
      open_webapp: '📱 Ilovada ochish',
    },

    currency: {
      UZS: `so'm`,
      USD: 'dollar',
      EUR: 'yevro',
      RUB: 'rubl',
    },

    validation: {
      account_name_length: `Nom 1 dan 50 belgigacha bo'lishi kerak`,
      invalid_balance: `To'g'ri raqam kiriting (0 yoki ko'proq)`,
    },

    transaction: {
      loading: '🤖 Tahlil qilyapman...',
      new_deposit: '💰 <b>Yangi daromad</b>',
      new_expense: '💸 <b>Yangi xarajat</b>',

      amount: 'Miqdor',
      category: 'Kategoriya',
      account: 'Hisob',
      note: 'Izoh',
      date: 'Sana',

      confidence_warning: `⚠️ Aniq emasman. Ma'lumotni tekshiring!`,
      save_error: `❌ Tranzaksiyani saqlab bo'lmadi`,
      outdated: `⚠️ Ma'lumot eskirgan. Qayta urinib ko'ring`,
      account_not_found: `❌ Hisob topilmadi`,
      category_not_found: `❌ Kategoriya topilmadi`,

      saved: `✅ Tranzaksiya saqlandi!`,
      deleted: `🗑 Tranzaksiya o'chirildi!`,
      canceled: `❌ Tranzaksiya bekor qilindi`,
      delete: `🗑 O'chirish`,
      delete_confirm: `⚠️ Ushbu tranzaksiyani o'chirmoqchimisiz?`,
      delete_success: `✅ Tranzaksiya o'chirildi`,
      delete_error: `❌ Tranzaksiyani o'chirib bo'lmadi`,

      account_balance: 'Balans',
      category_updated: '✅ Kategoriya yangilandi',
      account_updated: '✅ Hisob yangilandi',
      amount_updated: '✅ Miqdor yangilandi',

      invalid_amount: '❌ Musbat raqam kiriting',

      choose_category: '📁 <b>Kategoriyani tanlang:</b>',
      choose_account: '📊 <b>Hisobni tanlang:</b>',

      no_accounts_found: `❌ <b>Hisoblar yo'q</b>

Kamida bitta hisob yarating: /start → «Hisoblar».`,

      parse_error: `🤔 <b>Tushunmadim</b>

Buni sinab ko'ring:
• <code>Kofe 5000</code>
• <code>Tushlik 25000</code>
• <code>Oylik 5000000</code>`,

      editInWebApp: "Tahrirlovchini ochish uchun bosing:",
      openEditor: "✏️ Tahrirlovchini ochish"
    },

    confirmation: {
      edit: '✏️ Tahrirlash',
      edit_more: '✏️ Yana',
      confirm: '✅ Saqlash',
      cancel: '❌ Bekor qilish',
    },

    debt: {
      detection_message_borrowed: `💰 <b>Qarz aniqlandi!</b>

Siz pul qarz oldingiz. Kuzatishni xohlaysizmi?`,

      detection_message_lent: `💰 <b>Qarz aniqlandi!</b>

Siz pul qarz berdingiz. Kuzatishni xohlaysizmi?`,

      yes_track: '✅ Ha, kuzataman',
      no_track: '❌ Yo\'q, kerak emas',

      confirmation_title: '📋 Qarzni tasdiqlash',
      type: 'Turi',
      type_borrow: '💸 Men qarz oldim',
      type_lend: '💰 Men qarz berdim',
      from_whom: 'Kimdan',
      to_whom: 'Kimga',
      counterparty: 'Kontragent',
      amount: 'Miqdor',
      due_date: 'Qaytarish muddati',
      remind: 'Eslatma',
      note: 'Izoh',

      remind_in_3d: '3 kundan keyin',
      remind_in_1w: '1 haftadan keyin',
      remind_in_2w: '2 haftadan keyin',
      remind_in_1m: '1 oydan keyin',

      confirm: '✅ Tasdiqlash',
      cancel: '❌ Bekor qilish',
      edit_due_date: '📅 Muddatni o\'zgartirish',

      choose_due_date: '📅 <b>Eslatma muddatini tanlang:</b>',
      interval_3d: '3 kun',
      interval_1w: '1 hafta',
      interval_2w: '2 hafta',
      interval_1m: '1 oy',

      created: '✅ Qarz saqlandi!',
      rejected: '❌ Kuzatuv bekor qilindi',
      canceled: '❌ Qarz yaratish bekor qilindi',

      paid: '✅ To\'landi',
      remind_later: '🔔 Keyinroq eslatish',
      action_cancel: '❌ Qarzni bekor qilish',
      marked_paid: '✅ Qarz to\'langan deb belgilandi!',
      reminder_scheduled: '🔔 Eslatma ko\'chirildi.',
      debt_canceled: '❌ Qarz bekor qilindi.',
      action_error: '❌ Amalni bajarib bo\'lmadi. Qayta urinib ko\'ring.',

      outdated: '⚠️ Ma\'lumot eskirgan. Qayta urinib ko\'ring.',
      parse_error: '❌ Qarzni tanib bo\'lmadi. Qayta urinib ko\'ring.',
      create_error: '❌ Qarzni yaratib bo\'lmadi. Qayta urinib ko\'ring.',
    },

    errors: {
      retry_hint: `💡 Qayta urinib ko'ring yoki /start ni bosing`,
      critical: `❌ Jiddiy xatolik. @AsaHero ga murojaat qiling.`,
    },
  },
}


export function t(key: string, lang: Language, params?: any): string {
  const keys = key.split('.');
  let value: any = messages[lang];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation key not found: ${key} for language: ${lang}`);
      return key;
    }
  }

  if (typeof value === 'function') {
    return params ? value(...(Array.isArray(params) ? params : [params])) : value();
  }

  return value;
}

export function getDefaultLanguage(): Language {
  return 'ru';
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
