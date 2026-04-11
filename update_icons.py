import os

path = 'services.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacement block for the other tabs placeholders
target = """                    <!-- TAB: Лікування зубів -->
                    <div class="accordion-panel" id="content-therapy">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <span class="accordion-title">Терапевтичне лікування (карієс, пломби)</span>
                            </div>
                            <div class="accordion-arrow"><svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor"><path d="M1 1L7 7L13 1"/></svg></div>
                        </div>
                    </div>

                    <!-- TAB: Хірургія -->
                    <div class="accordion-panel" id="content-surgery">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <span class="accordion-title">Видалення зубів та імплантація</span>
                            </div>
                            <div class="accordion-arrow"><svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor"><path d="M1 1L7 7L13 1"/></svg></div>
                        </div>
                    </div>

                    <!-- TAB: Ортодонтія -->
                    <div class="accordion-panel" id="content-ortho">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <span class="accordion-title">Брекети та елайнери</span>
                            </div>
                            <div class="accordion-arrow"><svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor"><path d="M1 1L7 7L13 1"/></svg></div>
                        </div>
                    </div>"""

replacement = """                    <!-- TAB: Лікування зубів -->
                    <div class="accordion-panel" id="content-therapy">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 9c0-3 2-5 5-5s5 2 5 5v3c0 2 1 3 3 4v1H4v-1c2-1 3-2 3-4V9z"/><path d="M12 2s.5 2 1.5 2S15 2 15 2M9 2s.5 2 1.5 2S12 2 12 2"/></svg>
                                </div>
                                <span class="accordion-title">Терапевтичне лікування (карієс, пломби)</span>
                            </div>
                            <div class="accordion-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: Хірургія -->
                    <div class="accordion-panel" id="content-surgery">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 9c0-3 2-5 5-5s5 2 5 5v3c0 2 1 3 3 4v1H4v-1c2-1 3-2 3-4V9z"/><path d="M12 2s.5 2 1.5 2S15 2 15 2M9 2s.5 2 1.5 2S12 2 12 2"/></svg>
                                </div>
                                <span class="accordion-title">Видалення зубів та імплантація</span>
                            </div>
                            <div class="accordion-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: Ортодонтія -->
                    <div class="accordion-panel" id="content-ortho">
                        <div class="accordion-item-box">
                            <div class="accordion-header-box">
                                <div class="accordion-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 9c0-3 2-5 5-5s5 2 5 5v3c0 2 1 3 3 4v1H4v-1c2-1 3-2 3-4V9z"/><path d="M12 2s.5 2 1.5 2S15 2 15 2M9 2s.5 2 1.5 2S12 2 12 2"/></svg>
                                </div>
                                <span class="accordion-title">Брекети та елайнери</span>
                            </div>
                            <div class="accordion-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 10l5 5 5-5M7 6l5 5 5-5"/></svg>
                            </div>
                        </div>
                    </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Icons updated successfully.')
else:
    print('Target block not found in services.html.')
