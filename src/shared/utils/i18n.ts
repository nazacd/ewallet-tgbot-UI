export type Language = 'ru' | 'uz';

export const messages = {
  ru: {
    onboarding: {
      language_prompt: 'Выберите язык / Tilni tanlang',

      problem: `Ты зарабатываешь и тратишь деньги —
но в конце месяца не понимаешь, куда они ушли.

Чеки теряются, заметки забываются,
таблицы — неудобны.`,

      benefits: `Я помогу тебе видеть:
– сколько ты реально тратишь
– на что уходит больше всего
– сколько остаётся

Без таблиц. Без ручного учёта.

Большинство людей бросают учёт через 7 дней.
Поэтому мы сделали его одним сообщением.`,

      first_expense: `Напиши любой расход простым текстом.
Например:

<code>Кофе 18 000</code>
<code>Такси 25к</code>

Не бойся ошибиться — я подскажу.`,

      advanced: `Кстати, можно точнее 👇

– указать дату: <i>вчера</i>, <i>10 мая</i>
– указать счёт: <i>наличные</i>, <i>карта</i>
– добавить комментарий

Пример:
<code>Такси 25 000 вчера с карты</code>`,

      account_concept: `У тебя могут быть разные источники денег:
💵 Наличные в кошельке
💳 Банковская карта
🏦 Накопительный счёт
💰 Электронный кошелёк

Мы будем называть их «счетами».
Это помогает видеть, сколько где лежит.`,

      currency_prompt: 'Сперва выбери валюту:',

      account_name: `Как назовем твой первый счёт?

Примеры:
• Наличные
• Основная карта
• Humo
• Кошелёк`,

      balance_prompt: `Какой сейчас баланс на этом счёте?

Введи число (или 0, если начинаешь с нуля).`,

      timezone_prompt: `Чтобы лучше подстроиться, выбери часовой пояс.

Напиши название города или отправь геолокацию 📍`,

      completion: (accountName: string, balance: string, currency: string, timezone: string) =>
        `✅ Всё готово!
Твой счёт "${accountName}" создан.
Баланс: ${balance} ${currency}
Часовой пояс: ${timezone}

Теперь ты можешь записывать расходы и доходы. Просто напиши мне или отправь голосовое сообщение.`,
      errors: {
        parse_expense: '🤔 Попробуй еще раз. Например: "Кофе 5000"',
        city_not_found: '🤔 Город не найден. Попробуй еще раз или выбери из кнопок.',
        account_creation: '❌ Не удалось создать счёт. Попробуй /start снова.',
      },
      tutorial: {
        category_other: 'Прочее',
        date_today: 'сегодня',
        default_account: 'Основной счет',
        confirmation_message: (amount: number, categoryName: string, accountName: string, date: string) =>
          `Я понял 👌\n\n💰 Расход: ${amount} сум\n📁 Категория: ${categoryName}\n📊 Счёт: ${accountName}\n📅 Дата: ${date}`,
      },
    },

    buttons: {
      russian: '🇷🇺 Русский',
      uzbek: "🇺🇿 O'zbekcha",

      understood: 'Понятно, это про меня →',
      lets_try: 'Хорошо, давай попробуем',
      save: '✅ Сохранить',
      edit: '✏️ Изменить',
      got_it: 'Понятно →',
      lets_start: 'Понятно, начнем →',
      start_using: '🚀 Начать пользоваться',

      close: 'Закрыть',
      back: 'Назад',
    },

    menu: {
      accounts: '📊 Счета',
      transaction: '➕ Добавить',
      history: '📜 История',
      stats: '📈 Статистика',
      settings: '⚙️ Настройки',
      main_prompt: '🏠 Главное меню\n\nВыбери действие из меню ниже:',
      add_transaction_help: `➕ <b>Добавить транзакцию</b>

Отправь транзакцию текстом, голосом или фото чека.

📝 Примеры:
• "Кофе 5000"
• "Ужин 50000"
• "Зарплата 5000000"

🎤 Голосовое сообщение
📸 Фото чека`,
    },

    settings: {
      title: '⚙️ Настройки',
      current_currency: '💱 Текущая валюта',
      default_account: '📊 Счёт по умолчанию',
      not_set: 'Не установлен',
      change_currency: '💱 Изменить валюту',
      change_default_account: '📊 Счёт по умолчанию',
      back_to_menu: '« Назад в меню',
      back_to_settings: '« Назад к настройкам',
      choose_currency: '💱 <b>Выбор валюты</b>\n\nВыберите валюту для ваших счетов:',
      currency_changed: (currency: string) => `✅ Валюта успешно изменена на <b>${currency}</b>\n\n⚠️ Примечание: Существующие счета сохранят свою валюту.`,
      currency_change_error: '❌ Не удалось изменить валюту. Попробуйте позже.',
      no_accounts: '❌ У вас нет счетов. Создайте счёт сначала.',
      choose_account: '📊 <b>Выбор счёта по умолчанию</b>\n\nВыберите счёт:',
      account_changed: '✅ Счёт по умолчанию успешно изменён!',
      account_change_error: '❌ Не удалось изменить счёт по умолчанию.',
    },

    start: {
      error: '❌ Не удалось начать. Попробуйте еще раз.',
    },

    stats: {
      title: '📊 Статистика',
      no_transactions: '📊 У вас пока нет транзакций для отображения статистики за этот период.\n\nДобавьте несколько транзакций или попробуйте другой период.',
      expenses_by_category: '💸 Расходы по категориям',
      income_by_category: '💰 Доходы по категориям',
      other: 'Прочее',
      total_expenses: '💸 Всего расходов',
      total_income: '💰 Всего доходов',
      balance: '📊 Баланс',
      expenses_title: '💸 Расходы',
      income_title: '💰 Доходы',
      error: '❌ Не удалось получить статистику. Попробуйте позже.',
      periods: {
        month: 'Месяц',
        week: 'Неделя',
        day: 'День',
        all: '🗓️ Все время',
      },
      change_account: '🔄 Сменить счёт',
      back_to_menu: '« Назад в меню',
      months: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ],
      selection: {
        no_accounts: '❌ У вас ещё нет счетов. Используйте /start, чтобы создать первый.',
        overall: '📊 Общая статистика',
        message: '<b>📊 Статистика</b>\n\nВыберите счёт для просмотра статистики или посмотрите общую статистику по всем счетам:',
        error: '❌ Не удалось загрузить список счетов. Попробуйте позже.',
      },
    },

    accounts: {
      no_accounts: '📊 У вас пока нет счетов.\n\nСоздайте первый счёт, чтобы начать учёт финансов.',
      create_button: '➕ Создать счёт',
      your_accounts: '📊 <b>Ваши счета:</b>\n\n',
      add_button: '➕ Добавить счёт',
      manage_button: '📝 Управление счетами',
      error_load: '❌ Не удалось загрузить счета. Попробуйте снова.',
      create_step_name: 'Название счета',
      create_step_name_prompt: 'Как вы хотите его назвать?\n(например, "Сбережения", "Кредитка", "Наличные")',
      name_invalid: 'Введите корректное имя счёта (не более 50 символов).',
      create_step_balance: 'Начальный баланс',
      create_step_balance_prompt: (name: string, currency: string) => `Отлично! Какой текущий баланс у ${name}?\n(Введите число в ${currency}, либо 0, если начинаете с нуля)`,
      balance_invalid: 'Введите корректное число (0 или больше).',
      error_generic: 'Что-то пошло не так. Попробуйте снова с /accounts',
      created_success: (name: string, balance: string) => `✅ Счёт создан!\n\n📊 ${name}\n💰 Баланс: ${balance}\n\nИспользуйте /accounts, чтобы управлять счетами.\n\n💡 Теперь можете добавить транзакцию, например: "Кофе 5000"`,
      error_create: '❌ Не удалось создать счёт. Попробуйте снова.',
      manage_prompt: 'Выберите счёт для управления:',
      not_found: '❌ Счёт не найден.',
      is_default: '⭐️ Счёт по умолчанию',
      make_default: '⭐️ Сделать основным',
      delete: '🗑 Удалить счёт',
      error_details: '❌ Не удалось загрузить детали счёта.',
      setting_default: 'Устанавливаю по умолчанию...',
      set_default_success: (name: string) => `✅ ${name} теперь счёт по умолчанию!`,
      back_to_accounts: '« Назад к счетам',
      error_update: '❌ Не удалось обновить счёт',
      delete_confirm_prompt: '⚠️ Вы уверены, что хотите удалить этот счёт?\nВсе связанные транзакции тоже будут удалены. Это действие необратимо!',
      delete_confirm_yes: '✅ Да, удалить',
      deleting: 'Удаляю...',
      delete_success: '✅ Счёт успешно удалён.',
      error_delete: '❌ Не удалось удалить счёт',
    },

    history: {
      no_transactions: '📜 Пока нет ни одной транзакции.\n\nДобавьте первую, отправив сообщение вроде:\n"Кофе 5000"',
      error_load: '❌ Не удалось загрузить историю транзакций. Попробуйте снова.',
      title: '📊 История транзакций',
      summary_month: 'Итоги за месяц',
      income: '➕ Доход',
      expense: '➖ Расходы',
      page_info: (current: number, total: number) => `Страница ${current} из ${total}`,
      today: 'Сегодня',
      yesterday: 'Вчера',
      other: 'Прочее',
      account: 'Счёт',
      hint: 'Используйте кнопки ниже, чтобы листать историю.',
      outdated: 'История устарела. Используйте /history',
      not_found: 'Транзакция не найдена',
      unknown: 'Неизвестно',
      details_title: (num: string) => `🔍 Детали транзакции #${num}`,
      type: 'Тип',
      amount: 'Сумма',
      category: 'Категория',
      date: 'Дата',
      note: 'Комментарий',
      back_to_history: '« Назад к истории',
    },

    currency: {
      UZS: 'сум',
      USD: 'доллар',
      EUR: 'евро',
      RUB: 'рубль',
    },

    validation: {
      account_name_length: 'Название счёта должно быть от 1 до 50 символов.',
      invalid_balance: 'Введите корректное число (0 или больше).',
    },

    transaction: {
      loading: '🤖 Анализирую',
      new_deposit: 'Новая операция: Доход',
      new_expense: 'Новая операция: Расход',
      amount: 'Сумма',
      category: 'Категория',
      account: 'Счёт',
      note: 'Комментарий',
      date: 'Дата',
      confidence_warning: '⚠️ Я не уверен в распознавании. Пожалуйста, проверьте данные.',
      save_error: '❌ Не удалось сохранить транзакцию.',
      outdated: '❌ Данные транзакции устарели. Попробуйте снова.',
      account_not_found: '❌ Счёт не найден.',
      category_not_found: '❌ Категория не найдена.',
      saved: 'Транзакция сохранена!',
      canceled: 'Транзакция отменена!',
      account_balance: 'Баланс',
      category_updated: 'Категория обновлена',
      account_updated: 'Счёт обновлён',
      amount_updated: 'Сумма обновлена',
      invalid_amount: 'Введите корректное положительное число.',
      choose_category: '📁 Выберите категорию:',
      choose_account: '📊 Выберите счёт:',
      no_accounts_found: `
❌ Счета не найдены.

Вам нужен хотя бы один счет, чтоб пользоваться ботом.

Вы можете создать счет, используя /start и перейдя в раздел "Счета".`,
      parse_error: `
Сложно определить детали транзакции. Попробуйте, например:

• Кофе 5000
• Обед 25000
• Получил зарплату 5000000
`
    },

    confirmation: {
      edit: '✏️ Изменить',
      edit_more: '✏️ Изменить ещё',
      confirm: '✅ Сохранить',
      cancel: '❌ Отменить',
    },

    errors: {
      retry_hint: 'Попробуйте ещё раз или начните заново с /start, чтобы обновить данные.',
      critical: '❌ Произошла критическая ошибка. Пожалуйста, напишите @AsaHero для поддержки.',
    },
  },

  uz: {
    onboarding: {
      language_prompt: 'Выберите язык / Tilni tanlang',

      problem: `Siz pul ishlaysiz va sarflaysiz —
lekin oy oxirida qayerga ketganini tushunmaysiz.

Cheklar yo'qoladi, eslatmalar unutiladi,
jadvallar — noqulay.`,

      benefits: `Men sizga ko'rishga yordam beraman:
– qancha sarflayotganingizni
– eng ko'p nimaga ketishini
– qancha qolishini

Jadvalsiz. Qo'lda hisoblashsiz.

Ko'pchilik 7 kundan keyin hisobni tashlaydi.
Shuning uchun biz uni bitta xabar qildik.`,

      first_expense: `Har qanday xarajatni oddiy matn sifatida yozing.
Masalan:

<code>Kofe 18 000</code>
<code>Taksi 25k</code>

Xato qilishdan qo'rqmang — men ko'rsataman.`,

      advanced: `Aytganday, aniqroq bo'lishi mumkin 👇

– sanani ko'rsating: <i>kecha</i>, <i>10-may</i>
– hisobni ko'rsating: <i>naqd</i>, <i>karta</i>
– izoh qo'shing

Misol:
<code>Taksi 25 000 kecha kartadan</code>`,

      account_concept: `Sizda turli pul manbalari bo'lishi mumkin:
💵 Hamyonda naqd pul
💳 Bank kartasi
🏦 Jamg'arma hisobi
💰 Elektron hamyon

Biz ularni «hisoblar» deb ataymiz.
Bu qayerda qancha turganini ko'rishga yordam beradi.`,

      currency_prompt: 'Avval valyutani tanlang:',

      account_name: `Birinchi hisobingizni qanday nomlaymiz?

Misollar:
• Naqd pul
• Asosiy karta
• Humo
• Hamyon`,

      balance_prompt: `Ushbu hisobda hozir qancha balans bor?

Raqamni kiriting (yoki 0, agar noldan boshlasangiz).`,

      timezone_prompt: `Yaxshiroq sozlash uchun vaqt mintaqasini tanlang.

Shahar nomini yozing yoki joylashuvni yuboring 📍`,

      completion: (accountName: string, balance: string, currency: string, timezone: string) =>
        `✅ Hammasi tayyor!
Sizning hisobingiz "${accountName}" yaratildi.
Balans: ${balance} ${currency}
Vaqt mintaqasi: ${timezone}

Endi siz xarajat va daromadlarni yozishingiz mumkin. Shunchaki menga yozing yoki ovozli xabar yuboring.`,
      errors: {
        parse_expense: '🤔 Yana urinib ko\'ring. Masalan: "Kofe 5000"',
        city_not_found: "🤔 Shahar topilmadi. Yana urinib ko'ring yoki tugmalardan tanlang.",
        account_creation: "❌ Hisob yaratib bo'lmadi. /start ni qaytadan bosing.",
      },
      tutorial: {
        category_other: 'Boshqa',
        date_today: 'bugun',
        default_account: 'Asosiy hisob',
        confirmation_message: (amount: number, categoryName: string, accountName: string, date: string) =>
          `Tushundim 👌\n\n💰 Xarajat: ${amount} so'm\n📁 Kategoriya: ${categoryName}\n📊 Hisob: ${accountName}\n📅 Sana: ${date}`,
      },
    },

    buttons: {
      russian: '🇷🇺 Русский',
      uzbek: "🇺🇿 O'zbekcha",

      understood: 'Tushundim, bu men haqimda →',
      lets_try: "Yaxshi, keling sinab ko'ramiz",
      save: '✅ Saqlash',
      edit: "✏️ O'zgartirish",
      got_it: 'Tushundim →',
      lets_start: 'Tushundim, boshlaymiz →',
      start_using: '🚀 Foydalanishni boshlash',

      close: 'Yopish ❌',
      back: 'Orqaga',
    },

    menu: {
      accounts: '📊 Hisoblar',
      transaction: "➕ Qo'shish",
      history: '📜 Tarix',
      stats: '📈 Statistika',
      settings: '⚙️ Sozlamalar',
      main_prompt: '🏠 Asosiy menyu\n\nQuyidagi menyudan harakatni tanlang:',
      add_transaction_help: `➕ <b>Tranzaksiya qo'shish</b>

Tranzaksiyani matn, ovoz yoki chek fotosi sifatida yuboring.

📝 Misollar:
• "Kofe 5000"
• "Kechki ovqat 50000"
• "Ish haqi 5000000"

🎤 Ovozli xabar
📸 Chek fotosi`,
    },

    settings: {
      title: '⚙️ Sozlamalar',
      current_currency: '💱 Joriy valyuta',
      default_account: '📊 Asosiy hisob',
      not_set: "O'rnatilmagan",
      change_currency: "💱 Valyutani o'zgartirish",
      change_default_account: "📊 Asosiy hisobni o'zgartirish",
      back_to_menu: '« Menyuga qaytish',
      back_to_settings: '« Sozlamalarga qaytish',
      choose_currency: '💱 <b>Valyutani tanlash</b>\n\nHisoblaringiz uchun valyutani tanlang:',
      currency_changed: (currency: string) => `✅ Valyuta muvaffaqiyatli <b>${currency}</b> ga o'zgartirildi\n\n⚠️ Eslatma: Mavjud hisoblar o'z valyutasini saqlab qoladi.`,
      currency_change_error: "❌ Valyutani o'zgartirib bo'lmadi. Keyinroq urinib ko'ring.",
      no_accounts: "❌ Sizda hisoblar yo'q. Avval hisob yarating.",
      choose_account: '📊 <b>Asosiy hisobni tanlash</b>\n\nHisobni tanlang:',
      account_changed: "✅ Asosiy hisob muvaffaqiyatli o'zgartirildi!",
      account_change_error: "❌ Asosiy hisobni o'zgartirib bo'lmadi.",
    },

    start: {
      error: "❌ Boshlab bo'lmadi. Qaytadan urinib ko'ring.",
    },

    stats: {
      title: '📊 Statistika',
      no_transactions: "📊 Ushbu davr uchun statistika ko'rsatishga tranzaksiyalar yo'q.\n\nBir nechta tranzaksiya qo'shing yoki boshqa davrni tanlang.",
      expenses_by_category: '💸 Kategoriyalar bo\'yicha xarajatlar',
      income_by_category: '💰 Kategoriyalar bo\'yicha daromadlar',
      other: 'Boshqa',
      total_expenses: '💸 Jami xarajatlar',
      total_income: '💰 Jami daromadlar',
      balance: '📊 Balans',
      expenses_title: '💸 Xarajatlar',
      income_title: '💰 Daromadlar',
      error: "❌ Statistikani olib bo'lmadi. Keyinroq urinib ko'ring.",
      periods: {
        month: 'Oy',
        week: 'Hafta',
        day: 'Kun',
        all: '🗓️ Barcha vaqt',
      },
      change_account: "🔄 Hisobni o'zgartirish",
      back_to_menu: '« Menyuga qaytish',
      months: [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
      ],
      selection: {
        no_accounts: "❌ Sizda hali hisoblar yo'q. Birinchisini yaratish uchun /start dan foydalaning.",
        overall: '📊 Umumiy statistika',
        message: "<b>📊 Statistika</b>\n\nStatistikani ko'rish uchun hisobni tanlang yoki barcha hisoblar bo'yicha umumiy statistikani ko'ring:",
        error: "❌ Hisoblar ro'yxatini yuklab bo'lmadi. Keyinroq urinib ko'ring.",
      },
    },

    accounts: {
      no_accounts: "📊 Sizda hali hisoblar yo'q.\n\nMoliyaviy hisobni boshlash uchun birinchi hisobni yarating.",
      create_button: "➕ Hisob yaratish",
      your_accounts: "📊 <b>Sizning hisoblaringiz:</b>\n\n",
      add_button: "➕ Hisob qo'shish",
      manage_button: "📝 Hisoblarni boshqarish",
      error_load: "❌ Hisoblarni yuklab bo'lmadi. Qaytadan urinib ko'ring.",
      create_step_name: "Hisob nomi",
      create_step_name_prompt: "Uni qanday nomlamoqchisiz?\n(masalan, \"Jamg'arma\", \"Kredit karta\", \"Naqd pul\")",
      name_invalid: "To'g'ri hisob nomini kiriting (50 belgidan oshmasin).",
      create_step_balance: "Boshlang'ich balans",
      create_step_balance_prompt: (name: string, currency: string) => `Ajoyib! ${name} da hozirgi balans qancha?\n(${currency} da raqam kiriting, yoki noldan boshlasangiz 0)`,
      balance_invalid: "To'g'ri raqam kiriting (0 yoki ko'proq).",
      error_generic: "Nimadir xato ketdi. /accounts bilan qaytadan urinib ko'ring",
      created_success: (name: string, balance: string) => `✅ Hisob yaratildi!\n\n📊 ${name}\n💰 Balans: ${balance}\n\nHisoblarni boshqarish uchun /accounts dan foydalaning.\n\n💡 Endi tranzaksiya qo'shishingiz mumkin, masalan: "Kofe 5000"`,
      error_create: "❌ Hisob yaratib bo'lmadi. Qaytadan urinib ko'ring.",
      manage_prompt: "Boshqarish uchun hisobni tanlang:",
      not_found: "❌ Hisob topilmadi.",
      is_default: "⭐️ Asosiy hisob",
      make_default: "⭐️ Asosiy qilish",
      delete: "🗑 Hisobni o'chirish",
      error_details: "❌ Hisob tafsilotlarini yuklab bo'lmadi.",
      setting_default: "Asosiy qilib belgilanmoqda...",
      set_default_success: (name: string) => `✅ ${name} endi asosiy hisob!`,
      back_to_accounts: "« Hisoblarga qaytish",
      error_update: "❌ Hisobni yangilab bo'lmadi",
      delete_confirm_prompt: "⚠️ Ushbu hisobni o'chirishga ishonchingiz komilmi?\nBarcha bog'liq tranzaksiyalar ham o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi!",
      delete_confirm_yes: "✅ Ha, o'chirish",
      deleting: "O'chirilmoqda...",
      delete_success: "✅ Hisob muvaffaqiyatli o'chirildi.",
      error_delete: "❌ Hisobni o'chirib bo'lmadi",
    },

    history: {
      no_transactions: "📜 Hali hech qanday tranzaksiya yo'q.\n\nBirinchisini qo'shish uchun shunday xabar yuboring:\n\"Kofe 5000\"",
      error_load: "❌ Tranzaksiya tarixini yuklab bo'lmadi. Qaytadan urinib ko'ring.",
      title: "📊 Tranzaksiyalar tarixi",
      summary_month: "Oy yakunlari",
      income: "➕ Daromad",
      expense: "➖ Xarajat",
      page_info: (current: number, total: number) => `${total} dan ${current}-sahifa`,
      today: "Bugun",
      yesterday: "Kecha",
      other: "Boshqa",
      account: "Hisob",
      hint: "Tarixni varaqlash uchun quyidagi tugmalardan foydalaning.",
      outdated: "Tarix eskirgan. /history dan foydalaning",
      not_found: "Tranzaksiya topilmadi",
      unknown: "Noma'lum",
      details_title: (num: string) => `🔍 Tranzaksiya tafsilotlari #${num}`,
      type: "Tur",
      amount: "Summa",
      category: "Kategoriya",
      date: "Sana",
      note: "Izoh",
      back_to_history: "« Tarixga qaytish",
    },

    currency: {
      UZS: "so'm",
      USD: 'dollar',
      EUR: 'yevro',
      RUB: 'rubl',
    },

    validation: {
      account_name_length: "Hisob nomi 1 dan 50 belgigacha bo'lishi kerak.",
      invalid_balance: "To'g'ri raqam kiriting (0 yoki ko'proq).",
    },

    transaction: {
      loading: '🤖 Tahlil qilyapman',
      new_deposit: 'Yangi operatsiya: Daromad',
      new_expense: 'Yangi operatsiya: Xarajat',
      amount: 'Summa',
      category: 'Kategoriya',
      account: 'Hisob',
      note: 'Izoh',
      date: 'Sana',
      confidence_warning: "⚠️ Men aniqlashga ishonchim komil emas. Iltimos, ma'lumotlarni tekshiring.",
      save_error: "❌ Tranzaksiyani saqlab bo'lmadi.",
      outdated: "❌ Tranzaksiya ma'lumotlari eskirgan. Qaytadan urinib ko'ring.",
      account_not_found: '❌ Hisob topilmadi.',
      category_not_found: '❌ Kategoriya topilmadi.',
      saved: 'Tranzaksiyani saqlandi',
      account_balance: 'Balans',
      category_updated: 'Kategoriya yangilandi',
      account_updated: 'Hisob yangilandi',
      amount_updated: 'Summa yangilandi',
      invalid_amount: "To'g'ri musbat son kiriting.",
      choose_category: '📁 Kategoriyani tanlang:',
      choose_account: '📊 Hisobni tanlang:',
      no_accounts_found: "❌ Hisoblar topilmadi. Qaytadan urinib ko'ring.",
      parse_error: `
Tranzaksiya tafsilotlarini aniqlash qiyin. Masalan, quyidagicha bo'lishi kerak:

• Kofe 5000
• Tushlik 25000
• Oylik oldim 5000000
`

    },

    confirmation: {
      edit: "✏️ O'zgartirish",
      edit_more: "✏️ Yana o'zgartirish",
      confirm: '✅ Tasdiqlash',
      cancel: '❌ Bekor qilish',
    },

    errors: {
      retry_hint: "Qaytadan urinib ko'ring yoki ma'lumotlarni yangilash uchun /start ni bosing.",
      critical: "❌ Kritik xato yuz berdi. Iltimos, yordam uchun @AsaHero ga yozing.",
    },
  },
};

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
