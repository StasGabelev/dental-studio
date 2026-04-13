const translations = {
    UA: {
        // Navigation (Header/Footer)
        "nav-home": "Головна",
        "nav-services": "Послуги",
        "nav-works": "Наші роботи",
        "nav-about": "Про нас",
        "nav-contacts": "Контакти",
        
        // Footer (Contact Info)
        "footer-find-us": "ДЕ НАС ЗНАЙТИ",
        "footer-location": "Чернігів, Україна",
        "footer-address-street": "вулиця Незалежності, 21",
        "footer-map-btn": "ЗНАЙТИ НАС НА КАРТІ",
        "footer-hours-title": "ГРАФІК РОБОТИ",
        "footer-hours-days": "Пн — Пт, 10:00 — 18:00",
        "footer-tagline": "ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍",
        "footer-copyright": "Copyright © 2026. Dental Studio. Всі права захищені.",
        
        // Buttons
        "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "btn-book-short": "Записатися",
        
        // Hero
        "hero-title": "ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍",
        "hero-subtitle": "Від ідеальної гігієни до імплантів 'під ключ'. Онлайн-запис за посиланням ⬇️",
        "services-hero-title": "Послуги",
        "services-hero-subtitle": "Ми пропонуємо повний спектр стоматологіческих послуг для вашого здоров'я та краси.",
        
        // Features
        "feat-aesthetic": "Естетична стоматологія",
        "feat-therapy": "Лікування зубів",
        "feat-surgery": "Хірургія",
        "feat-ortho": "Ортодонтія",
        
        // Service Categories (Services Page Tabs)
        "cat-aesthetic-title": "Естетична <br> стоматологія",
        "cat-therapy-title": "Лікування <br> зубів",
        "cat-surgery-title": "Хірургія",
        "cat-ortho-title": "Ортодонтія",

        // -- 1. Aesthetic Dentistry --
        "svc-veneer-title": "Керамічні вініри",
        "svc-veneer-desc": "Тонкі керамічні накладки, які кріпляться на передню поверхню зубів для покращення їх кольору, форми та загальної естетики посмішки.",
        "svc-composite-veneer-title": "Композитні вініри та реставрації",
        "svc-composite-veneer-desc": "Високоестетичне покращення та відтворення природньої форми та рельєфу зубів композитним матеріалом без препарування власних тканин зуба із терміном служби 5 років.",
        "svc-ceramic-restoration-title": "Керамічні реставрації (вініри, коронки, накладки)",
        "svc-ceramic-restoration-desc": "Відтворення природності, рельєфу та структури зуба керамічними вінірами, зміна кольору посмішки на більш яскравішу, відновлення функції зубного ряду із терміном служби 15 років.",
        
        // -- 2. Tooth Treatment (Therapy) --
        "svc-endo-title": "Ендодонтія",
        "svc-endo-desc": "Ювелірна робота вузького спеціаліста по збереженню зуба. Первинне та вторинне лікування кореневих каналів, вилучення уламків інструментів та лікування запальних процесів на верхівці кореня зуба із використанням мікроскопа.",
        "svc-caries-title": "Лікування карієсу",
        "svc-caries-desc": "Видалення уражених тканин зуба із подальшим відновленням його природньої форми та морфології композитним матеріалом за сучасними протоколами із використанням операційного мікроскопу.",
        "svc-periodontal-title": "Пародонтологічне лікування",
        "svc-periodontal-desc": "Зняття надясенних та підясенних зубних відкладень. Очищення кореня від зубного каменю із використанням ручних інструментів Hu-Friedy. Антисептична обробка пародонтальних кишень. Заповнення пародонтологічної карти. Урок гігієни.",
        "svc-hygiene-title": "Професійна гігієна зубів",
        "svc-hygiene-desc": "Контроль гігієни ротової порожнини. Зняття твердих зубних відкладень за допомогою ультразвукового скейлера та ручних інструментів. Зняття м’якого зубного нальоту повітряно-абразивною обробкою Prophyflex.",
        "svc-whitening-title": "Відбілювання зубів",
        "svc-whitening-desc": "Безпечна та високоефективна процедура клінічного відбілювання системою Beyond за допомогою гелю та спеціального лазерного світла для досягнення білішого та здоровішого вигляду зубів.",

        // -- 3. Surgery --
        "svc-consult-title": "Консультація",
        "svc-consult-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу роботи.",
        "svc-implant-title": "Імплантація",
        "svc-implant-desc": "Імплантація відсутніх зубів із використанням швейцарських імплантатів Straumann та спеціальних хірургічних шаблонів, які виготовляються для кожного пацієнта індивідуально.",
        "svc-extraction-title": "Видалення зубів",
        "svc-extraction-desc": "Майстерне видалення зубів під місцевою анастезією або в медикаментозному сні (седація). Седація – це занурення пацієнта в глибокий або поверхневий природний сон під контролем лікаря-анастезіолога.",
        "svc-gum-surgery-title": "Закриття рецесій, хірургічне подовження клінічної коронки зуба, усунення ясеневої посмішки",
        "svc-gum-surgery-desc": "Високоестетичні хірургічні операції із яснами (корекція ясен) для створення нової естетики посмішки пацієнта в комбінації із керамічними вінірами.",

        // -- 4. Orthodontics --
        "svc-braces-title": "Лікування брекет-системою",
        "svc-braces-desc": "Повернення пацієнту не лише краси та естетики посмішки, а й відновлення правильного функціонування зубо-щелепної системи за допомогою лікування брекет системою.",
        "svc-aligners-title": "Лікування елайнерами",
        "svc-aligners-desc": "Повернення пацієнту не лише краси та естетики посмішки, а й відновлення правильного функціонування зубо-щелепної системи за допомогою лікування елайнерами. Елайнери - індивідуальний комплект прозорих кап, які непомітно для оточуючих вирівнюють зуби.",

        // Prices...
        "price-veneer-unit": "Керамічний вінір (1 одиниця)",
        "price-comp-veneer": "Композитний вінір (1 одиниця)",
        "price-endo-incisor": "Лікування кореневих каналів (різці, ікла)",
        "price-endo-premolar": "Лікування кореневих каналів (премоляри)",
        "price-endo-molar": "Лікування кореневих каналів (моляри)",
        "price-caries-1": "Лікування карієсу - І рівень складності",
        "price-caries-2": "Лікування карієсу - ІI рівень складності",
        "price-caries-3": "Лікування карієсу - ІII рівень складності",
        "price-periodont-1": "Лікування пародонтиту - І ступінь",
        "price-periodont-2": "Лікування пародонтиту - ІІ ступінь",
        "price-periodont-3": "Лікування пародонтиту - ІІI ступінь",
        "price-hygiene": "Професійна гігієна",
        "price-hygiene-smoker": "Професійна гігієна (наліт курця)",
        "price-whitening": "Відбілювання",
        "price-consult-general": "Загальна консультація",
        "price-consult-checkup": "Стоматологічний CHECK-UP",
        "price-consult-modjaw": "Функціональна діагностика MODJAW",
        "price-implant-neodent": "Імплант NEODENT (Бразилія)",
        "price-implant-sla": "Імплант STRAUMANN SLA (Швейцарія)",
        "price-implant-slactive": "Імплант STRAUMANN SLACTIVE (Швейцарія)",
        "price-crown-monolit": "Коронка на імпланті (monolit)",
        "price-crown-aesthetic": "Коронка на імпланті (платформа + абатмент + керамічний вінір)",
        "price-extraction": "Видалення зуба",
        "price-extraction-atypical-1": "Атипове видалення (просте)",
        "price-extraction-atypical-2": "Атипове видалення (складне)",
        "price-sedation": "Медикаментозний сон (седація) - 1 година",
        "price-gum-smile": "Операція усунення ясенної посмішки (10 зубів)",
        "price-recession": "Закриття рецесій біля одного зуба",
        "price-gum-extension": "Видовження ясен біля одного зуба",
        "price-braces-metal": "Лікування брекет-системою (метал)",
        "price-braces-ceramic": "Лікування брекет-системою (кераміка)",
        "price-braces-self-metal": "Лікування брекет-системою (самолігуючі, метал)",
        "price-braces-self-ceramic": "Лікування брекет-системою (самолігуючі, кераміка)",
        "price-ortho-visit": "Щомісячний контрольний візит до ортодонта",
        "price-aligners": "Лікування елайнерами",
        "price-frontal-restoration": "Реставрація фронтального зуба",
        "price-art-restoration": "Художня реставрація - по ключу",
        "price-veneer-digital": "Керамічний вінір (digital)",
        "price-veneer-layering": "Керамічний вінір (digital + нашарування)",

        // Interior (About preview)
        "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об’єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
        "about-p2": "Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматологіії.",
        "about-more": "ДІЗНАТИСЯ БІЛЬШЕ",
        "about-services": "ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ",
        
        // Works
        "works-title": "НАШІ РОБОТИ",
        "works-btn": "ПЕРЕГЛЯНУТИ УСІ РОБОТИ",
        
        // Appointment Form
        "form-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "form-subtitle": "Залиште заявку і адміністратор зв’яжеться з Вами, або зателефонуйте нам особисто",
        "form-phone-label": "Зв’язатися з нами для консультації: ",
        "form-name-placeholder": "Прізвище та ім'я",
        "form-comment-placeholder": "Коментар",
        "form-phone-placeholder": "Номер телефону",
        "form-privacy": "Погоджуюся на обробку персональних даних та з умовами політики конфіденційності",
        "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        
        // Map
        "map-title": "ДЕ НАС ЗНАЙТИ",
        "map-address": "ВУЛИЦЯ НЕЗАЛЕЖНОСТІ, 21, ЧЕРНІГІВ, УКРАЇНА",
        "map-btn": "ЗНАЙТИ НАС НА КАРТІ",
        
        // About Page
        "about-page-title": "Про клініку — Dental Studio",
        "about-section-tag": "ПРО КЛІНІКУ",
        "about-team-title": "НАША КОМАНДА",
        "team-savchuk-name": "АНДРІЙ САВЧУК",
        "team-savchuk-role": "Заступник головного лікаря. Художня реставрація зубів.",
        "team-anatoliy-name": "АНАТОЛІЙ ТОКАР",
        "team-anatoliy-role": "Засновник, головний лікар. Стоматолог-ортопед/хірург.",
        "team-mariya-name": "МАРІЯ ТОКАР",
        "team-mariya-role": "Стоматолог-терапевт. Естетична реставрація.",

        // Cases Page
        "cases-page-title": "Наші роботи — Dental Studio",
        "cases-hero-title": "НАШІ РОБОТИ",
        "filter-all": "Всі роботи",
        "filter-veneers": "Керамічні вініри",
        "filter-composite": "Композитні вініри",
        "filter-restoration": "Композитні реставрації",
        "filter-implants": "Імплантація",
        "filter-ortho": "Ортодонтія",
        "filter-whitening": "Відбілювання зубів",

        // Contacts Page
        "contacts-page-title": "Контакти — Dental Studio"
    },
    EN: {
        // Navigation (Header/Footer)
        "nav-home": "Home",
        "nav-services": "Services",
        "nav-works": "Portfolio",
        "nav-about": "About Us",
        "nav-contacts": "Contact",
        
        // Footer (Contact Info)
        "footer-find-us": "WHERE TO FIND US",
        "footer-location": "Chernihiv, Ukraine",
        "footer-address-street": "Nezalezhnosti Street, 21",
        "footer-map-btn": "FIND US ON MAP",
        "footer-hours-title": "WORKING HOURS",
        "footer-hours-days": "Mon — Fri, 10:00 — 18:00",
        "footer-tagline": "INNOVATION, AESTHETICS, COMFORT🤍",
        "footer-copyright": "Copyright © 2026. Dental Studio. All rights reserved.",
        
        // Buttons
        "btn-book": "BOOK A CONSULTATION",
        "btn-book-short": "Book Now",
        
        // Hero
        "hero-title": "INNOVATION, AESTHETICS, COMFORT🤍",
        "hero-subtitle": "From ideal hygiene to 'turnkey' implants. Online booking via link ⬇️",
        "services-hero-title": "Services",
        "services-hero-subtitle": "We offer a full range of dental services for your health and beauty.",
        
        // Features
        "feat-aesthetic": "Aesthetic Dentistry",
        "feat-therapy": "Tooth Treatment",
        "feat-surgery": "Surgery",
        "feat-ortho": "Orthodontics",

        // Service Categories (Services Page Tabs)
        "cat-aesthetic-title": "Aesthetic <br> Dentistry",
        "cat-therapy-title": "Tooth <br> Treatment",
        "cat-surgery-title": "Surgery",
        "cat-ortho-title": "Orthodontics",

        // -- 1. Aesthetic Dentistry --
        "svc-veneer-title": "Ceramic Veneers",
        "svc-veneer-desc": "Thin ceramic overlays attached to the front surface of the teeth to improve their color, shape, and overall smile aesthetics.",
        "svc-composite-veneer-title": "Composite Veneers and Restorations",
        "svc-composite-veneer-desc": "Highly aesthetic improvement and reproduction of the natural shape and relief of teeth with composite material without preparation of the tooth's own tissues, with a 5-year service life.",
        "svc-ceramic-restoration-title": "Ceramic Restorations (Veneers, Crowns, Overlays)",
        "svc-ceramic-restoration-desc": "Restoration of natural appearance, relief, and tooth structure with ceramic veneers, changing the smile color to a brighter one, and restoring dental function with a 15-year service life.",
        
        // -- 2. Tooth Treatment (Therapy) --
        "svc-endo-title": "Endodontics",
        "svc-endo-desc": "Exquisite work of a specialist to preserve the tooth. Primary and secondary root canal treatment, removal of instrument fragments, and treatment of inflammatory processes at the tip of the tooth root using a microscope.",
        "svc-caries-title": "Caries Treatment",
        "svc-caries-desc": "Removal of affected tooth tissues followed by restoration of its natural shape and morphology with composite material using modern protocols and an operating microscope.",
        "svc-periodontal-title": "Periodontal Treatment",
        "svc-periodontal-desc": "Removal of supra- and subgingival dental deposits. Cleaning the root from tartar using Hu-Friedy hand instruments. Antiseptic treatment of periodontal pockets. Filling of a periodontal chart. Hygiene lesson.",
        "svc-hygiene-title": "Professional Teeth Cleaning",
        "svc-hygiene-desc": "Oral hygiene control. Removal of hard dental deposits using an ultrasonic scaler and hand tools. Removal of soft dental plaque by air-abrasive Prophyflex treatment.",
        "svc-whitening-title": "Teeth Whitening",
        "svc-whitening-desc": "Safe and highly effective clinical whitening procedure by the Beyond system using gel and special laser light to achieve a whiter and healthier appearance of teeth.",

        // -- 3. Surgery --
        "svc-consult-title": "Consultation",
        "svc-consult-desc": "The doctor conducts a complete diagnosis of the oral cavity, scans the teeth, examines them under a microscope, and creates a treatment plan with an estimate for each stage of work.",
        "svc-implant-title": "Implantation",
        "svc-implant-desc": "Implantation of missing teeth using Swiss Straumann implants and special surgical templates, which are manufactured for each patient individually.",
        "svc-extraction-title": "Tooth Extraction",
        "svc-extraction-desc": "Masterful extraction of teeth under local anesthesia or in drug-induced sleep (sedation). Sedation is the immersion of a patient into a deep or surface natural sleep under the control of an anesthesiologist.",
        "svc-gum-surgery-title": "Recession closure, surgical lengthening of the clinical crown, gummy smile elimination",
        "svc-gum-surgery-desc": "Highly aesthetic surgical operations with the gums (gum correction) to create new smile aesthetics in combination with ceramic veneers.",

        // -- 4. Orthodontics --
        "svc-braces-title": "Braces System Treatment",
        "svc-braces-desc": "Returning the beauty and aesthetics of the smile to the patient along with restoring the correct functioning of the dentofacial system through braces system treatment.",
        "svc-aligners-title": "Aligners Treatment",
        "svc-aligners-desc": "Returning the beauty and aesthetics of the smile to the patient along with restoring the correct functioning of the dentofacial system through aligners treatment. Aligners are individual sets of transparent caps that align teeth invisibly to others.",

        // Prices...
        "price-veneer-unit": "Ceramic veneer (1 unit)",
        "price-comp-veneer": "Composite veneer (1 unit)",
        "price-endo-incisor": "Root canal treatment (incisors, canines)",
        "price-endo-premolar": "Root canal treatment (premolars)",
        "price-endo-molar": "Root canal treatment (molars)",
        "price-caries-1": "Caries treatment - I difficulty level",
        "price-caries-2": "Caries treatment - II difficulty level",
        "price-caries-3": "Caries treatment - III difficulty level",
        "price-periodont-1": "Periodontitis treatment - I stage",
        "price-periodont-2": "Periodontitis treatment - II stage",
        "price-periodont-3": "Periodontitis treatment - III stage",
        "price-hygiene": "Professional hygiene",
        "price-hygiene-smoker": "Professional hygiene (smoker's plaque)",
        "price-whitening": "Whitening",
        "price-consult-general": "General consultation",
        "price-consult-checkup": "Dental CHECK-UP",
        "price-consult-modjaw": "Functional diagnostics MODJAW",
        "price-implant-neodent": "NEODENT implant (Brazil)",
        "price-implant-sla": "STRAUMANN SLA implant (Switzerland)",
        "price-implant-slactive": "STRAUMANN SLACTIVE implant (Switzerland)",
        "price-crown-monolit": "Crown on implant (monolith)",
        "price-crown-aesthetic": "Crown on implant (platform + abutment + ceramic veneer)",
        "price-extraction": "Tooth extraction",
        "price-extraction-atypical-1": "Atypical extraction (simple)",
        "price-extraction-atypical-2": "Atypical extraction (complex)",
        "price-sedation": "Sedation (drug-induced sleep) - 1 hour",
        "price-gum-smile": "Gummy smile elimination surgery (10 teeth)",
        "price-recession": "Recession closure near one tooth",
        "price-gum-extension": "Gum lengthening near one tooth",
        "price-braces-metal": "Braces system treatment (metal)",
        "price-braces-ceramic": "Braces system treatment (ceramic)",
        "price-braces-self-metal": "Braces system treatment (self-ligating, metal)",
        "price-braces-self-ceramic": "Braces system treatment (self-ligating, ceramic)",
        "price-ortho-visit": "Monthly check-up with the orthodontist",
        "price-aligners": "Aligners treatment",
        "price-frontal-restoration": "Frontal Tooth Restoration",
        "price-art-restoration": "Artistic Restoration - by Key",
        "price-veneer-digital": "Ceramic Veneer (digital)",
        "price-veneer-layering": "Ceramic Veneer (digital + layering)",

        // Interior (About preview)
        "about-p1": "Dental Studio is a dental clinic in Chernihiv that brought together like-minded people for whom the beauty and aesthetics of your smile are the essence of professional life.",
        "about-p2": "We provide a wide range of dental services at the highest level, based on digital dentistry and a piece of each of our doctors' souls, setting trends in modern dentistry.",
        "about-more": "LEARN MORE",
        "about-services": "VIEW OUR SERVICES",
        
        // Works
        "works-title": "OUR SUCCESS CASES",
        "works-btn": "VIEW ALL CASES",
        
        // Appointment Form
        "form-title": "BOOK A CONSULTATION",
        "form-subtitle": "Leave a request and the administrator will contact you, or call us personally",
        "form-phone-label": "Contact us for a consultation: ",
        "form-name-placeholder": "First and last name",
        "form-comment-placeholder": "Comment",
        "form-phone-placeholder": "Phone number",
        "form-privacy": "I agree to the processing of personal data and to the terms of the privacy policy",
        "form-btn": "BOOK A CONSULTATION",
        
        // Map
        "map-title": "WHERE TO FIND US",
        "map-address": "NEZALEZHNOSTI STREET, 21, CHERNIHIV, UKRAINE",
        "map-btn": "FIND US ON THE MAP",

        // About Page
        "about-page-title": "About the Clinic — Dental Studio",
        "about-section-tag": "ABOUT CLINIC",
        "about-team-title": "OUR TEAM",
        "team-savchuk-name": "ANDRII SAVCHUK",
        "team-savchuk-role": "Deputy Chief Physician. Aesthetic dental restoration.",
        "team-anatoliy-name": "ANATOLII TOKAR",
        "team-anatoliy-role": "Founder, Chief Physician. Orthopedic dentist / Surgeon.",
        "team-mariya-name": "MARIIA TOKAR",
        "team-mariya-role": "Dentist-therapist. Aesthetic restoration.",

        // Cases Page
        "cases-page-title": "Our Portfolio — Dental Studio",
        "cases-hero-title": "OUR SUCCESS CASES",
        "filter-all": "All Works",
        "filter-veneers": "Ceramic Veneers",
        "filter-composite": "Composite Veneers",
        "filter-restoration": "Composite Restorations",
        "filter-implants": "Implantation",
        "filter-ortho": "Orthodontics",
        "filter-whitening": "Teeth Whitening",

        // Contacts Page
        "contacts-page-title": "Contact Us — Dental Studio"
    }
};

window.translations = translations;
