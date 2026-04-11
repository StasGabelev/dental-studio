import os

html_content = """<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Послуги — TOKAR CLINIC</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;700&display=swap" rel="stylesheet">
    <style>
        /* 1:1 Original Hero Replica */
        .service-fullscreen-hero {
            position: relative;
            min-height: 100vh;
            background-color: #000;
            display: flex;
            align-items: stretch;
            padding-top: 100px; 
            overflow: hidden;
            box-sizing: border-box;
        }

        .service-hero-left {
            flex: 0 0 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding-left: 10%;
            z-index: 2;
        }

        .service-hero-right {
            flex: 0 0 50%;
            position: relative;
            z-index: 1;
            background: #000;
        }

        .service-hero-right img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
            -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 20%);
            mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 20%);
        }

        .service-huge-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 54px;
            font-weight: 200;
            color: #fff;
            line-height: 1.1;
            margin-bottom: 40px;
            letter-spacing: -0.5px;
        }

        .btn-nude {
            background-color: #EFDCD1;
            color: #111;
            font-family: 'Montserrat', sans-serif;
            font-size: 13px;
            font-weight: 400;
            text-transform: uppercase;
            padding: 18px 42px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: max-content;
            text-decoration: none;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
        }

        .btn-nude:hover {
            background-color: #e5cbbe;
        }

        @media (max-width: 900px) {
            .service-fullscreen-hero {
                flex-direction: column;
                padding-top: 80px;
            }
            .service-hero-left {
                flex: none;
                height: 50vh;
                padding: 0 20px;
                text-align: center;
                align-items: center;
                justify-content: flex-end;
                padding-bottom: 40px;
            }
            .service-hero-right {
                flex: none;
                height: 50vh;
                order: -1;
            }
            .service-huge-title { font-size: 34px; }
        }
    </style>
</head>
<body class="bg-black">
    <div id="header-placeholder" style="position: absolute; width: 100%; top: 0; left: 0; z-index: 100;"></div>

    <main>
        <section class="service-fullscreen-hero">
            <div class="service-hero-left">
                <h1 class="service-huge-title">Естетична стоматологія</h1>
                <a href="#form" class="btn-nude">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</a>
            </div>
            <div class="service-hero-right">
                <img src="https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/preview.jpg" alt="Естетична стоматологія">
            </div>
        </section>

        <section class="services-details-section">
            <div class="container" style="max-width: 1200px; padding: 0 20px;">
                <div class="services-tabs-row">
                    <button class="tab-btn-outline active" data-target="content-aesthetic">ЕСТЕТИЧНА СТОМАТОЛОГІЯ</button>
                    <button class="tab-btn-outline" data-target="content-therapy">Лікування зубів</button>
                    <button class="tab-btn-outline" data-target="content-surgery">Хірургія</button>
                    <button class="tab-btn-outline" data-target="content-ortho">Ортодонтія</button>
                </div>

                <div class="services-accordion-box">
                    <div class="accordion-panel active" id="content-aesthetic">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 2C8.5 2 6 5 6 9c0 2-1 3.5-3 4.5v1.5h18v-1.5c-2-1-3-2.5-3-4.5 0-4-2.5-7-6-7z"/><path d="M16 4.5c1 0 1.5.5 1.5 1.5m-7 0c0-1 .5-1.5 1.5-1.5M19 18v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2"/></svg>
                                </div>
                                <span class="accordion-title">Консультація</span>
                            </div>
                            <div class="accordion-arrow">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg>
                            </div>
                        </div>
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8"/><path d="M12 8v8m-4-4h8"/></svg>
                                </div>
                                <span class="accordion-title">Композитні вініри та реставрації</span>
                            </div>
                            <div class="accordion-arrow">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg>
                            </div>
                        </div>
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8"/><path d="M12 8v8m-4-4h8"/></svg>
                                </div>
                                <span class="accordion-title">Керамічні реставрації (вініри, коронки, накладки)</span>
                            </div>
                            <div class="accordion-arrow">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg>
                            </div>
                        </div>
                    </div>

                    <div class="accordion-panel" id="content-therapy">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 9c0-3 2-5 5-5s5 2 5 5v3c0 2 1 3 3 4v1H4v-1c2-1 3-2 3-4V9z"/></svg></div>
                                <span class="accordion-title">Терапевтичне лікування (карієс, пломби)</span>
                            </div>
                            <div class="accordion-arrow"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg></div>
                        </div>
                    </div>

                    <div class="accordion-panel" id="content-surgery">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 9c0-3 2-5 5-5s5 2 5 5v3c0 2 1 3 3 4v1H4v-1c2-1 3-2 3-4V9z"/></svg></div>
                                <span class="accordion-title">Видалення зубів та імплантація</span>
                            </div>
                            <div class="accordion-arrow"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg></div>
                        </div>
                    </div>

                    <div class="accordion-panel" id="content-ortho">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 9c0-3 2-5 5-5s5 2 5 5v3c0 2 1 3 3 4v1H4v-1c2-1 3-2 3-4V9z"/></svg></div>
                                <span class="accordion-title">Брекети та елайнери</span>
                            </div>
                            <div class="accordion-arrow"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <div id="footer-placeholder"></div>

    <script src="components.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const tabs = document.querySelectorAll('.tab-btn-outline');
            const panels = document.querySelectorAll('.accordion-panel');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    panels.forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    const targetPanel = document.getElementById(tab.getAttribute('data-target'));
                    if (targetPanel) targetPanel.classList.add('active');
                });
            });
        });
    </script>
</body>
</html>"""

with open('services.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('services.html updated successfully with explicit UTF-8 encoding.')
