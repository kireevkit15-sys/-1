-- ERUDITION questions v2 (30: 10 BRONZE, 10 SILVER, 10 GOLD)
-- Новые категории: Математика, Экономика, Медицина, Искусство, Лингвистика, Технологии, Музыка, Мифология, Архитектура, Геология

-- BRONZE (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какое число является наименьшим простым?', '["0","1","2","3"]', 2, 'ERUDITION', 'BRONZE', 'Математика', 'Число 2 — наименьшее и единственное чётное простое число. Единица простым числом не считается.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Кто написал «Лунную сонату»?', '["Моцарт","Бетховен","Шопен","Бах"]', 1, 'ERUDITION', 'BRONZE', 'Музыка', 'Людвиг ван Бетховен написал Сонату для фортепиано No 14 (Лунную) в 1801 году.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой орган человеческого тела самый большой?', '["Печень","Мозг","Кожа","Лёгкие"]', 2, 'ERUDITION', 'BRONZE', 'Медицина', 'Кожа — самый большой орган человека, её площадь составляет около 1.5-2 квадратных метров.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Кто изобрёл первый печатный станок в Европе?', '["Да Винчи","Гутенберг","Галилей","Ньютон"]', 1, 'ERUDITION', 'BRONZE', 'Технологии', 'Иоганн Гутенберг изобрёл печатный станок с подвижными литерами около 1440 года.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой металл является жидким при комнатной температуре?', '["Свинец","Олово","Ртуть","Цинк"]', 2, 'ERUDITION', 'BRONZE', 'Химия', 'Ртуть (Hg) — единственный металл, находящийся в жидком состоянии при комнатной температуре.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой язык является самым распространённым по числу носителей?', '["Английский","Испанский","Китайский (мандаринский)","Хинди"]', 2, 'ERUDITION', 'BRONZE', 'Лингвистика', 'Мандаринский китайский — родной язык для более чем 900 миллионов человек.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Кто написал картину «Звёздная ночь»?', '["Моне","Ван Гог","Ренуар","Сезанн"]', 1, 'ERUDITION', 'BRONZE', 'Искусство', 'Винсент ван Гог написал «Звёздную ночь» в 1889 году, находясь в лечебнице в Сен-Реми.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Из какой страны родом шахматы?', '["Китай","Персия","Индия","Египет"]', 2, 'ERUDITION', 'BRONZE', 'История', 'Шахматы произошли от индийской игры чатуранга, появившейся около VI века нашей эры.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой минерал является самым твёрдым по шкале Мооса?', '["Корунд","Топаз","Алмаз","Кварц"]', 2, 'ERUDITION', 'BRONZE', 'Геология', 'Алмаз занимает 10-е место по шкале Мооса — это максимальная твёрдость среди минералов.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое ВВП?', '["Валовой внутренний продукт","Внешний валютный показатель","Всеобщий денежный процент","Валютный доходный поток"]', 0, 'ERUDITION', 'BRONZE', 'Экономика', 'ВВП — рыночная стоимость всех конечных товаров и услуг, произведённых в стране за год.', 'eruditionXp');

-- SILVER (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой архитектурный стиль характерен для собора Парижской Богоматери?', '["Романский","Готический","Барокко","Ренессанс"]', 1, 'ERUDITION', 'SILVER', 'Архитектура', 'Нотр-Дам де Пари — классический образец французской готической архитектуры XII-XIV веков.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Кто доказал Великую теорему Ферма?', '["Перельман","Уайлс","Гаусс","Эйлер"]', 1, 'ERUDITION', 'SILVER', 'Математика', 'Эндрю Уайлс доказал Великую теорему Ферма в 1995 году, спустя 358 лет после её формулировки.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой гормон вырабатывается поджелудочной железой для регуляции сахара в крови?', '["Адреналин","Кортизол","Инсулин","Тироксин"]', 2, 'ERUDITION', 'SILVER', 'Медицина', 'Инсулин снижает уровень глюкозы в крови, способствуя её усвоению клетками.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой экономист написал «Исследование о природе и причинах богатства народов»?', '["Маркс","Кейнс","Адам Смит","Рикардо"]', 2, 'ERUDITION', 'SILVER', 'Экономика', 'Адам Смит опубликовал этот основополагающий труд по экономике в 1776 году.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Кто в греческой мифологии украл огонь у богов для людей?', '["Геракл","Прометей","Одиссей","Гефест"]', 1, 'ERUDITION', 'SILVER', 'Мифология', 'Прометей похитил огонь с Олимпа и передал его людям, за что был наказан Зевсом.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой тип горной породы образуется из магмы?', '["Осадочная","Метаморфическая","Магматическая","Хемогенная"]', 2, 'ERUDITION', 'SILVER', 'Геология', 'Магматические (изверженные) породы формируются при застывании и кристаллизации магмы или лавы.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой композитор написал «Времена года»?', '["Гайдн","Бах","Вивальди","Гендель"]', 2, 'ERUDITION', 'SILVER', 'Музыка', 'Антонио Вивальди написал цикл из четырёх скрипичных концертов «Времена года» около 1720 года.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой учёный открыл структуру ДНК?', '["Мендель","Дарвин","Уотсон и Крик","Пастер"]', 2, 'ERUDITION', 'SILVER', 'Биология', 'Джеймс Уотсон и Фрэнсис Крик описали двойную спираль ДНК в 1953 году.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'К какой языковой семье относится финский язык?', '["Индоевропейская","Уральская","Алтайская","Сино-тибетская"]', 1, 'ERUDITION', 'SILVER', 'Лингвистика', 'Финский относится к финно-угорской группе уральской языковой семьи, а не к индоевропейской.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой закон Ньютона гласит «действие равно противодействию»?', '["Первый","Второй","Третий","Четвёртый"]', 2, 'ERUDITION', 'SILVER', 'Физика', 'Третий закон Ньютона: сила действия равна по модулю и противоположна по направлению силе противодействия.', 'eruditionXp');

-- GOLD (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какое число Эйлера (e) с точностью до сотых?', '["2.72","2.78","2.68","2.81"]', 0, 'ERUDITION', 'GOLD', 'Математика', 'Число Эйлера e приблизительно равно 2.71828... — основание натурального логарифма.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой художник создал технику сфумато?', '["Микеланджело","Рафаэль","Леонардо да Винчи","Тициан"]', 2, 'ERUDITION', 'GOLD', 'Искусство', 'Леонардо да Винчи усовершенствовал технику сфумато — мягких переходов тона без видимых линий.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое инфляция спроса?', '["Рост цен из-за превышения спроса над предложением","Снижение цен","Рост производства","Увеличение экспорта"]', 0, 'ERUDITION', 'GOLD', 'Экономика', 'Инфляция спроса возникает, когда совокупный спрос растёт быстрее, чем производственные мощности экономики.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой нейромедиатор называют «молекулой удовольствия»?', '["Серотонин","Дофамин","Окситоцин","Эндорфин"]', 1, 'ERUDITION', 'GOLD', 'Медицина', 'Дофамин связан с системой вознаграждения мозга, мотивацией и предвкушением удовольствия.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Кто был мифическим основателем Рима?', '["Одиссей","Эней","Ромул","Тесей"]', 2, 'ERUDITION', 'GOLD', 'Мифология', 'По легенде, Ромул основал Рим в 753 году до н.э., убив своего брата-близнеца Рема.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какая тектоническая плита самая большая?', '["Североамериканская","Евразийская","Тихоокеанская","Антарктическая"]', 2, 'ERUDITION', 'GOLD', 'Геология', 'Тихоокеанская плита — крупнейшая литосферная плита, занимающая около 103 миллионов кв. км.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой архитектор спроектировал музей Гуггенхайма в Бильбао?', '["Заха Хадид","Фрэнк Гери","Ренцо Пиано","Норман Фостер"]', 1, 'ERUDITION', 'GOLD', 'Архитектура', 'Фрэнк Гери спроектировал музей Гуггенхайма в Бильбао, открытый в 1997 году — шедевр деконструктивизма.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое закон Мура?', '["Число транзисторов на чипе удваивается примерно каждые 2 года","Закон термодинамики","Принцип квантовой механики","Правило сетевого эффекта"]', 0, 'ERUDITION', 'GOLD', 'Технологии', 'Гордон Мур предсказал в 1965 году, что плотность транзисторов будет удваиваться каждые два года.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какая музыкальная система использует 12 равных полутонов?', '["Пифагорейский строй","Чистый строй","Равномерно темперированный строй","Натуральный строй"]', 2, 'ERUDITION', 'GOLD', 'Музыка', 'Равномерно темперированный строй делит октаву на 12 равных полутонов и используется в современных инструментах.', 'eruditionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой лингвист создал теорию универсальной грамматики?', '["Соссюр","Хомский","Сепир","Витгенштейн"]', 1, 'ERUDITION', 'GOLD', 'Лингвистика', 'Ноам Хомский предложил теорию универсальной грамматики — врождённой способности к языку.', 'eruditionXp');


-- RHETORIC questions v2 (30: 10 BRONZE, 10 SILVER, 10 GOLD)
-- Новые категории: Переговоры, Пропаганда, Теория коммуникации, Дебаты, Семантика, Психология влияния, Критическое мышление, Публичные выступления, Медиаграмотность, Этика дискуссии

-- BRONZE (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «скользкий склон» в аргументации?', '["Утверждение, что одно событие неизбежно приведёт к цепочке катастрофических последствий","Постепенное уступание","Снижение качества аргументов","Отступление от темы"]', 0, 'RHETORIC', 'BRONZE', 'Критическое мышление', 'Slippery slope — ошибка, когда без достаточных оснований утверждается, что первый шаг неизбежно приведёт к катастрофе.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой элемент НЕ входит в классическую триаду Аристотеля (средства убеждения)?', '["Этос","Пафос","Логос","Хронос"]', 3, 'RHETORIC', 'BRONZE', 'История риторики', 'Аристотель выделял три средства убеждения: этос (доверие), пафос (эмоции), логос (логика). Хронос не входит в триаду.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое BATNA в переговорах?', '["Лучшая альтернатива обсуждаемому соглашению","Базовая тактика","Тип блефа","Стратегия давления"]', 0, 'RHETORIC', 'BRONZE', 'Переговоры', 'BATNA (Best Alternative to a Negotiated Agreement) — ваш запасной вариант, если переговоры провалятся.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эхо-камера» в медиа?', '["Среда, где люди слышат только подтверждение своих взглядов","Студия звукозаписи","Метод усиления сигнала","Тип подкаста"]', 0, 'RHETORIC', 'BRONZE', 'Медиаграмотность', 'Эхо-камера — информационная среда, где алгоритмы и социальные связи усиливают уже существующие убеждения.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что означает принцип «Steel man» в дискуссии?', '["Представить аргумент оппонента в наиболее сильной форме","Использовать жёсткие аргументы","Не уступать ни в чём","Атаковать слабые стороны"]', 0, 'RHETORIC', 'BRONZE', 'Этика дискуссии', 'Steel man — противоположность straw man: вы усиливаете аргумент оппонента, прежде чем его опровергать.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой тип вопроса подразумевает ответ в самой формулировке?', '["Открытый","Закрытый","Наводящий","Уточняющий"]', 2, 'RHETORIC', 'BRONZE', 'Публичные выступления', 'Наводящий вопрос содержит подсказку или предполагает определённый ответ, влияя на собеседника.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «апелляция к большинству»?', '["Утверждение, что нечто истинно, потому что так считает большинство","Демократическое решение","Социологический опрос","Статистический метод"]', 0, 'RHETORIC', 'BRONZE', 'Логические ошибки', 'Argumentum ad populum — ошибка, когда популярность идеи используется как доказательство её истинности.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что изучает семантика?', '["Значение слов и выражений","Звуки речи","Строение предложений","Происхождение слов"]', 0, 'RHETORIC', 'BRONZE', 'Семантика', 'Семантика — раздел лингвистики, изучающий значение слов, фраз и текстов.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Принцип Чалдини «взаимность» означает:', '["Люди склонны отвечать услугой на услугу","Все отношения равны","Обмен информацией","Взаимное уважение"]', 0, 'RHETORIC', 'BRONZE', 'Психология влияния', 'Роберт Чалдини показал, что получив что-то, люди чувствуют обязанность дать что-то взамен.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «тезис» в структуре аргументации?', '["Основное утверждение, которое нужно доказать","Вывод из доказательства","Пример","Контраргумент"]', 0, 'RHETORIC', 'BRONZE', 'Дебаты', 'Тезис — центральное утверждение, ради доказательства которого строится вся аргументация.', 'rhetoricXp');

-- SILVER (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «принцип дефицита» по Чалдини?', '["Люди больше ценят то, что менее доступно","Экономия ресурсов","Минимализм в речи","Краткость выступлений"]', 0, 'RHETORIC', 'SILVER', 'Психология влияния', 'Ограниченность товара или возможности повышает его воспринимаемую ценность — один из шести принципов влияния.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «газлайтинг»?', '["Манипуляция, заставляющая жертву сомневаться в своём восприятии реальности","Освещение сцены","Техника публичных выступлений","Метод переговоров"]', 0, 'RHETORIC', 'SILVER', 'Манипуляции', 'Газлайтинг — форма психологического насилия, при которой манипулятор заставляет жертву сомневаться в своей адекватности.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «техника двери в лицо» (door-in-the-face)?', '["Сначала завышенная просьба, затем реальная — меньшая","Агрессивные продажи","Отказ от переговоров","Резкое начало разговора"]', 0, 'RHETORIC', 'SILVER', 'Переговоры', 'После отказа на большую просьбу человек с большей вероятностью согласится на меньшую, более разумную.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Модель коммуникации Шеннона-Уивера включает понятие:', '["Шум (помехи) в канале передачи","Только отправителя и получателя","Исключительно визуальные сигналы","Телепатию"]', 0, 'RHETORIC', 'SILVER', 'Теория коммуникации', 'Шеннон и Уивер ввели понятие шума — помех, искажающих сообщение при передаче по каналу связи.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эквивокация» в логике?', '["Использование слова в разных значениях в одном рассуждении","Равенство аргументов","Двусторонняя позиция","Нейтральное высказывание"]', 0, 'RHETORIC', 'SILVER', 'Семантика', 'Эквивокация — логическая ошибка, возникающая при использовании многозначного слова в разных смыслах в одном аргументе.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Формат дебатов Линкольна-Дугласа основан на:', '["Противостоянии двух участников по ценностному вопросу","Командной работе","Импровизации","Научном эксперименте"]', 0, 'RHETORIC', 'SILVER', 'Дебаты', 'Формат LD-дебатов построен на споре двух участников о ценностных суждениях, восходит к дебатам 1858 года.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «пропаганда бандвагона»?', '["Призыв присоединиться, потому что все уже это делают","Музыкальная группа","Рекламная кампания","Военный марш"]', 0, 'RHETORIC', 'SILVER', 'Пропаганда', 'Bandwagon — пропагандистский приём, создающий ощущение, что все уже на борту, и вы отстаёте.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Правило 7-38-55 Меграбяна утверждает, что в коммуникации:', '["Слова составляют лишь 7% воздействия, тон — 38%, язык тела — 55%","Все каналы равны","Слова важнее всего","Важен только контекст"]', 0, 'RHETORIC', 'SILVER', 'Теория коммуникации', 'Альберт Меграбян показал, что при передаче эмоций невербальные сигналы значительно превосходят вербальные.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «принцип благожелательности» (principle of charity) в интерпретации?', '["Толкование аргумента оппонента в наиболее разумном ключе","Благотворительность","Уступка в споре","Согласие с оппонентом"]', 0, 'RHETORIC', 'SILVER', 'Критическое мышление', 'Принцип благожелательности требует интерпретировать неясные аргументы собеседника максимально разумно.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «кликбейт»?', '["Заголовок, намеренно преувеличивающий содержание ради кликов","Тип вируса","Рекламный формат","Жанр журналистики"]', 0, 'RHETORIC', 'SILVER', 'Медиаграмотность', 'Кликбейт — манипулятивный приём в медиа, использующий сенсационные заголовки для привлечения трафика.', 'rhetoricXp');

-- GOLD (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «ZOPA» в переговорах?', '["Зона возможного соглашения — пересечение интересов сторон","Стратегия давления","Тип ультиматума","Метод блефа"]', 0, 'RHETORIC', 'GOLD', 'Переговоры', 'ZOPA (Zone of Possible Agreement) — диапазон, в котором обе стороны готовы заключить сделку.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой пропагандистский приём описывает «перенос авторитета символа на идею»?', '["Transfer","Testimonial","Card stacking","Plain folks"]', 0, 'RHETORIC', 'GOLD', 'Пропаганда', 'Transfer — приём, при котором авторитет уважаемого символа (флаг, наука) переносится на продвигаемую идею.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «принцип социального доказательства»?', '["Люди ориентируются на поведение других в неопределённых ситуациях","Судебная практика","Научный метод","Статистический анализ"]', 0, 'RHETORIC', 'GOLD', 'Психология влияния', 'Социальное доказательство — один из шести принципов Чалдини: в условиях неопределённости мы копируем поведение окружающих.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «мертвый кот на столе» (dead cat strategy)?', '["Создание отвлекающего скандала для переключения внимания","Жестокий метод","Юридический трюк","Блеф в покере"]', 0, 'RHETORIC', 'GOLD', 'Пропаганда', 'Стратегия, приписываемая Линтону Кросби: создать шокирующий инфоповод, чтобы все забыли о реальной проблеме.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Спираль молчания Ноэль-Нойман описывает:', '["Люди скрывают мнение, которое считают непопулярным","Тишину в аудитории","Паузы в речи","Молчаливое согласие"]', 0, 'RHETORIC', 'GOLD', 'Теория коммуникации', 'Элизабет Ноэль-Нойман показала, что страх изоляции заставляет людей молчать, если их мнение кажется меньшинственным.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «парадокс кучи» (sorites paradox)?', '["Невозможность определить точную границу при постепенном изменении","Проблема больших данных","Ошибка подсчёта","Логический тупик"]', 0, 'RHETORIC', 'GOLD', 'Семантика', 'Парадокс кучи показывает проблему нечётких границ: если убирать по зерну, когда куча перестаёт быть кучей?', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «гильотина Юма»?', '["Невозможность вывести долженствование из факта","Метод принятия решений","Логическая операция","Тип аргумента"]', 0, 'RHETORIC', 'GOLD', 'Критическое мышление', 'Дэвид Юм показал, что из описательных утверждений (как есть) нельзя логически вывести нормативные (как должно быть).', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой риторический приём Кеннеди использовал во фразе «Не спрашивай, что страна сделала для тебя — спроси, что ты сделал для страны»?', '["Хиазм","Метафора","Гипербола","Литота"]', 0, 'RHETORIC', 'GOLD', 'Публичные выступления', 'Хиазм — риторическая фигура, в которой вторая часть фразы зеркально повторяет структуру первой с перестановкой.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «Закон Годвина»?', '["Чем длиннее интернет-дискуссия, тем выше вероятность сравнения с нацизмом","Закон авторского права","Алгоритм ранжирования","Правило модерации"]', 0, 'RHETORIC', 'GOLD', 'Этика дискуссии', 'Майк Годвин сформулировал в 1990 году: по мере роста онлайн-дискуссии вероятность сравнения с Гитлером стремится к 1.', 'rhetoricXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эффект третьего лица» в медиа?', '["Вера, что медиа влияют на других больше, чем на тебя","Привлечение третьей стороны","Тройной источник","Мнение эксперта"]', 0, 'RHETORIC', 'GOLD', 'Медиаграмотность', 'Third-person effect: люди считают, что пропаганда и реклама влияют на других, но не на них самих.', 'rhetoricXp');


-- INTUITION questions v2 (30: 10 BRONZE, 10 SILVER, 10 GOLD)
-- Новые категории: Статистика, Нейронаука, Теория игр, Поведенческая экономика, Эвристики, Логические парадоксы, Социальная психология, Эволюционная психология, Метакогниция, Рискология

-- BRONZE (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «средняя» в статистике?', '["Сумма всех значений, делённая на их количество","Самое частое значение","Среднее между наибольшим и наименьшим","Центральное значение ряда"]', 0, 'INTUITION', 'BRONZE', 'Статистика', 'Среднее арифметическое — базовая мера центральной тенденции, сумма всех значений делённая на их количество.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «стадное поведение»?', '["Следование за группой без самостоятельного анализа","Агрессия толпы","Лидерство","Коллективная мудрость"]', 0, 'INTUITION', 'BRONZE', 'Социальная психология', 'Стадное поведение — склонность людей копировать действия большинства, не анализируя ситуацию самостоятельно.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой участок мозга отвечает за эмоции страха?', '["Гиппокамп","Амигдала","Мозжечок","Гипоталамус"]', 1, 'INTUITION', 'BRONZE', 'Нейронаука', 'Амигдала (миндалевидное тело) играет ключевую роль в обработке эмоций, особенно страха и тревоги.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «дилемма заключённого»?', '["Ситуация, где рациональный выбор каждого приводит к худшему результату для всех","Тюремная проблема","Логическая задача","Математическое уравнение"]', 0, 'INTUITION', 'BRONZE', 'Теория игр', 'В дилемме заключённого два игрока, действуя в своих интересах, получают результат хуже, чем если бы сотрудничали.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эффект владения» (endowment effect)?', '["Люди ценят вещи выше, когда уже ими владеют","Удовольствие от покупки","Коллекционирование","Привычка к роскоши"]', 0, 'INTUITION', 'BRONZE', 'Поведенческая экономика', 'Эффект владения — мы переоцениваем то, что уже имеем, и просим за это больше, чем готовы заплатить.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «метакогниция»?', '["Мышление о собственном мышлении","Сверхразум","Медитация","Многозадачность"]', 0, 'INTUITION', 'BRONZE', 'Метакогниция', 'Метакогниция — способность осознавать и регулировать свои мыслительные процессы.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что означает «корреляция не означает причинно-следственную связь»?', '["Два совпадающих явления не обязательно связаны причинно","Статистика бесполезна","Все связи случайны","Наука невозможна"]', 0, 'INTUITION', 'BRONZE', 'Статистика', 'Два явления могут коррелировать из-за третьего фактора или случайно, без причинной связи.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эффект толпы» (bystander effect)?', '["Чем больше свидетелей, тем меньше вероятность, что кто-то поможет","Паника толпы","Сила коллектива","Групповое решение"]', 0, 'INTUITION', 'BRONZE', 'Социальная психология', 'Эффект свидетеля: ответственность размывается среди присутствующих, и каждый ждёт, что поможет другой.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эвристика репрезентативности»?', '["Оценка вероятности по сходству с типичным представителем","Метод обучения","Техника запоминания","Математическая формула"]', 0, 'INTUITION', 'BRONZE', 'Эвристики', 'Мы оцениваем вероятность события по тому, насколько оно похоже на наш стереотип о данной категории.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какова вероятность выпадения решки при подбрасывании честной монеты?', '["25%","50%","75%","100%"]', 1, 'INTUITION', 'BRONZE', 'Вероятности', 'У честной монеты ровно два исхода с равной вероятностью, поэтому каждый имеет вероятность 50%.', 'intuitionXp');

-- SILVER (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «неприятие потерь» (loss aversion)?', '["Боль от потери ощущается сильнее, чем радость от равного приобретения","Страх бедности","Жадность","Осторожность"]', 0, 'INTUITION', 'SILVER', 'Поведенческая экономика', 'Канеман и Тверски показали, что потеря 100 рублей ощущается примерно в 2 раза сильнее, чем радость от находки 100 рублей.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «Равновесие Нэша»?', '["Состояние, где ни один игрок не может улучшить позицию, изменив только свою стратегию","Баланс сил","Экономическое равновесие","Физический закон"]', 0, 'INTUITION', 'SILVER', 'Теория игр', 'В равновесии Нэша каждый участник выбирает оптимальную стратегию с учётом стратегий остальных.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «нейропластичность»?', '["Способность мозга изменять свою структуру и функции в течение жизни","Гибкость черепа","Тип нервной ткани","Хирургическая процедура"]', 0, 'INTUITION', 'SILVER', 'Нейронаука', 'Нейропластичность — способность мозга формировать новые нейронные связи, адаптируясь к опыту и обучению.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что показывает «парадокс дня рождения»?', '["В группе из 23 человек вероятность совпадения дней рождения превышает 50%","Все рождаются в один день","День рождения нельзя предсказать","Каждый день кто-то рождается"]', 0, 'INTUITION', 'SILVER', 'Вероятности', 'Контринтуитивно, но уже в группе из 23 человек шанс совпадения дней рождения двух людей превышает 50%.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «ошибка выжившего» (survivorship bias)?', '["Фокус на успешных случаях и игнорирование неудач","Страх смерти","Оптимизм","Везение"]', 0, 'INTUITION', 'SILVER', 'Эвристики', 'Мы видим только тех, кто выжил/преуспел, и не учитываем тех, кто провалился, искажая выводы.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эффект Зейгарник»?', '["Незавершённые задачи запоминаются лучше завершённых","Забывание информации","Путаница в памяти","Дежавю"]', 0, 'INTUITION', 'SILVER', 'Психология', 'Блюма Зейгарник обнаружила, что прерванные действия запоминаются на 90% лучше, чем завершённые.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «парадокс Симпсона»?', '["Тенденция, присутствующая в подгруппах, исчезает или меняется при объединении данных","Персонаж мультфильма","Статистическая ошибка","Парадокс времени"]', 0, 'INTUITION', 'SILVER', 'Статистика', 'Парадокс Симпсона: тренд в нескольких группах может развернуться, когда данные объединяются в одну.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Почему люди склонны к «статус-кво»?', '["Изменение воспринимается как потенциальная потеря","Лень","Отсутствие возможностей","Довольство жизнью"]', 0, 'INTUITION', 'SILVER', 'Принятие решений', 'Предпочтение статус-кво связано с неприятием потерь: любое изменение несёт риск потери текущего состояния.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «парадокс Эллсберга»?', '["Люди предпочитают известные риски неизвестным, даже если шансы одинаковы","Военная стратегия","Математическая задача","Экономический кризис"]', 0, 'INTUITION', 'SILVER', 'Рискология', 'Даниел Эллсберг показал, что люди избегают неопределённости (ambiguity aversion), даже если объективные шансы не хуже.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Какой эффект объясняет, почему мы запоминаем первый и последний элементы списка лучше?', '["Эффект первичности и недавности","Эффект повторения","Эффект контраста","Эффект контекста"]', 0, 'INTUITION', 'SILVER', 'Психология', 'Эффект серийной позиции: первые элементы попадают в долговременную память, последние — в кратковременную.', 'intuitionXp');

-- GOLD (10)
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «антихрупкость» по Талебу?', '["Свойство систем, которые усиливаются от стрессов и хаоса","Непробиваемость","Устойчивость к ударам","Гибкость"]', 0, 'INTUITION', 'GOLD', 'Рискология', 'Антихрупкость — не просто устойчивость. Антихрупкие системы становятся сильнее от потрясений, в отличие от хрупких или устойчивых.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эффект Дидро»?', '["Одна новая покупка запускает цепь дополнительных покупок","Философский парадокс","Литературный приём","Экономический цикл"]', 0, 'INTUITION', 'GOLD', 'Поведенческая экономика', 'Дени Дидро описал, как новый халат заставил его заменить всю обстановку — одна вещь потянула за собой остальные.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «парадокс Брайесса»?', '["Добавление дороги может ухудшить трафик для всех","Рост населения снижает пробки","Больше дорог — меньше проблем","Парковка решает пробки"]', 0, 'INTUITION', 'GOLD', 'Теория игр', 'Парадокс Брайесса: добавление маршрута в сети может увеличить время в пути, если каждый водитель выбирает оптимальный путь.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «зеркальные нейроны»?', '["Нейроны, активирующиеся и при выполнении действия, и при наблюдении за ним","Симметричные клетки мозга","Нейроны зрительной коры","Клетки памяти"]', 0, 'INTUITION', 'GOLD', 'Нейронаука', 'Зеркальные нейроны, открытые у приматов, активируются как при действии, так и при наблюдении того же действия у других.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «регрессия к среднему»?', '["Экстремальные результаты обычно сменяются более обычными","Деградация системы","Снижение показателей","Возврат к началу"]', 0, 'INTUITION', 'GOLD', 'Статистика', 'Регрессия к среднему: после аномально высокого или низкого результата следующий, вероятно, будет ближе к средней величине.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что описывает «эффект Пигмалиона»?', '["Высокие ожидания приводят к улучшению результатов","Завышенная самооценка","Мифологическое проклятие","Эффект красоты"]', 0, 'INTUITION', 'GOLD', 'Социальная психология', 'Розенталь показал: ожидания учителя влияют на реальную успеваемость учеников — самосбывающееся пророчество.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «бритва Хэнлона»?', '["Не приписывай злому умыслу то, что объясняется глупостью","Метод принятия решений","Хирургический инструмент","Логический оператор"]', 0, 'INTUITION', 'GOLD', 'Метакогниция', 'Бритва Хэнлона — эвристический принцип: если ошибку можно объяснить некомпетентностью, не стоит подозревать заговор.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «парадокс выбора» по Барри Шварцу?', '["Избыток вариантов снижает удовлетворённость и парализует принятие решений","Выбор всегда рационален","Больше выбора — больше счастья","Выбора не существует"]', 0, 'INTUITION', 'GOLD', 'Принятие решений', 'Шварц показал, что чрезмерное количество вариантов вызывает тревогу, откладывание и сожаление о выбранном.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Почему люди переоценивают вероятность авиакатастроф по сравнению с автоавариями?', '["Из-за эвристики доступности — авиакатастрофы ярче освещаются в СМИ","Самолёты опаснее","Статистика неточна","Люди хорошо оценивают риски"]', 0, 'INTUITION', 'GOLD', 'Эвристики', 'Яркие, эмоциональные события легче вспоминаются, что создаёт иллюзию их большей вероятности.', 'intuitionXp');
INSERT INTO questions (id, text, options, "correctIndex", branch, difficulty, category, explanation, "statPrimary") VALUES
(gen_random_uuid(), 'Что такое «эффект Барнума» (эффект Форера)?', '["Склонность принимать расплывчатые описания как точно подходящие лично себе","Цирковой трюк","Магический эффект","Оптическая иллюзия"]', 0, 'INTUITION', 'GOLD', 'Когнитивные искажения', 'Эффект Барнума объясняет популярность гороскопов: общие описания кажутся удивительно точными для каждого.', 'intuitionXp');
