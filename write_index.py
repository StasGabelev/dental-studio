content = """<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TOKAR CLINIC — Стоматологічна клініка в Києві</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;400;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="header-placeholder"></div>

    <main>
        <section id="hero" class="hero">
            <div class="hero__video-wrap">
                <video autoplay muted loop playsinline id="hero-video">
                    <source src="https://storage.googleapis.com/tokar_clinic_site/video/home-cover/web.mp4" type="video/mp4">
                </video>
                <div class="hero__overlay"></div>
            </div>
            
            <div class="container--hero-wrap">
                <div class="hero__content">
                    <h1>Ми доповнюємо вашу красу</h1>
                    <a href="#form" class="btn btn--cta">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</a>
                </div>
            </div>
        </section>

        <section id="features" class="hero__features-section">
            <div class="container-full">
                <div class="features-grid">
                    <div class="feature-card" onclick="location.href='services.html'"><span>Естетична стоматологія</span></div>
                    <div class="feature-card" onclick="location.href='services.html'"><span>Лікування зубів</span></div>
                    <div class="feature-card" onclick="location.href='services.html'"><span>Хірургія</span></div>
                    <div class="feature-card" onclick="location.href='services.html'"><span>Ортодонтія</span></div>
                </div>
            </div>
        </section>

        <section id="about" class="interior-block">
            <div class="interior-container">
                <div class="interior-grid">
                    <div class="interior-media">
                        <video autoplay muted loop playsinline id="interior-video" style="width: 100%; height: 100%; object-fit: cover;">
                            <source src="assets/custom_hero.mp4" type="video/mp4">
                        </video>
                    </div>
                    <div class="interior-content">
                        <div class="interior-content__text">
                            <p class="main-desc">
                                TOKAR CLINIC — це стоматологічна клініка в Києві, що об’єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.
                            </p>
                            <p class="side-desc">
                                Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматологіії.
                            </p>
                            <div class="interior-links">
                                <a href="about.html" class="more-link">ДІЗНАТИСЯ БІЛЬШЕ</a>
                                <a href="services.html" class="more-link">ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="works" class="works-section">
            <div class="container">
                <div class="works-header">
                    <h2 class="works-title">НАШІ РОБОТИ</h2>
                </div>
                <div class="works__grid">
                    <div class="works__item" onclick="location.href='case-1.html'"><img src="https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/preview.jpg" alt="1"></div>
                    <div class="works__item" onclick="location.href='case-1.html'"><img src="https://storage.googleapis.com/tokar_clinic_site/patients/ShmakovaTania/preview.jpg" alt="2"></div>
                    <div class="works__item" onclick="location.href='case-1.html'"><img src="https://storage.googleapis.com/tokar_clinic_site/patients/FlurkoSergiy/preview.jpg" alt="3"></div>
                    <div class="works__item" onclick="location.href='case-1.html'"><img src="https://storage.googleapis.com/tokar_clinic_site/patients/PavlykIra/preview.jpg" alt="4"></div>
                    <div class="works__item" onclick="location.href='case-1.html'"><img src="https://storage.googleapis.com/tokar_clinic_site/patients/TokarMaria/preview.jpg" alt="5"></div>
                    <div class="works__item" onclick="location.href='case-1.html'"><img src="https://storage.googleapis.com/tokar_clinic_site/patients/DenysovaOlena/preview.jpg" alt="6"></div>
                </div>
                <div class="works-footer">
                    <a href="cases.html" class="btn btn--outline-dark">ПЕРЕГЛЯНУТИ УСІ РОБОТИ</a>
                </div>
            </div>
        </section>

        <section id="form" class="appointment">
            <div class="container--narrow">
                <div class="appointment__inner">
                    <h2 class="section-title-alt">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</h2>
                    <p class="appointment-subtitle">Залиште заявку і администратор зв’яжеться з Вами, або зателефонуйте нам особисто</p>
                    <p class="appointment-phone">Зв’язатися з нами для консультації: <a href="tel:+380505550027">+380 50 555 00 27</a></p>
                    <form class="appointment-form">
                        <div class="form-cols">
                            <input type="text" placeholder="Прізвище та ім'я" required>
                            <textarea placeholder="Коментар"></textarea>
                        </div>
                        <div class="form-cols">
                            <input type="tel" placeholder="Номер телефону" required>
                        </div>
                        <div class="form-checkbox">
                            <input type="checkbox" id="privacy" checked required>
                            <label for="privacy">Погоджуюся на обробку персональних данных та з умовами політики конфіденційності</label>
                        </div>
                        <button type="submit" class="btn btn--cta btn--xl">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</button>
                    </form>
                </div>
            </div>
        </section>

        <section id="map" class="map-section">
            <div class="container">
                <h2 class="map-title">ДЕ НАС ЗНАЙТИ</h2>
                <div class="map-info">
                    <div class="map-info__inner">
                        <p class="map-address">ПРОСПЕКТ БЕРЕСТЕЙСЬКИЙ, 5В КИЇВ, УКРАЇНА</p>
                        <a href="https://goo.gl/maps/..." target="_blank" class="btn--map-pin">ЗНАЙТИ НАС НА КАРТІ</a>
                        <div class="map-hours">
                            <p class="hours-title">ГРАФІК РОБОТИ</p>
                            <p>Пн — Пт, 10:00 — 18:00</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="map-iframe-wrap">
                <div class="map-mask"></div>
            </div>
        </section>
    </main>

    <div id="footer-placeholder"></div>

    <script src="components.js"></script>
    <script src="main.js"></script>
</body>
</html>"""

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))
