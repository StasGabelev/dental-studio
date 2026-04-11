import os

path = 'styles.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of the duplicated service sections
start_line = -1
for i, line in enumerate(lines):
    if '/* Services Details Section' in line:
        start_line = i
        break

if start_line != -1:
    refined_css = """
/* ============================================================
   SERVICES DETAILS SECTION - 1:1 REPLICA
   ============================================================ */
.services-details-section {
    background-color: #0c0c0c;
    padding: 100px 0 140px;
}

.services-tabs-row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 60px;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
}

.tab-btn-outline {
    flex: 1;
    background: #0c0c0c;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    padding: 24px 10px;
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 300;
    cursor: pointer;
    text-transform: none;
    letter-spacing: 1px;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.tab-btn-outline:nth-child(1) { text-transform: uppercase; }

.tab-btn-outline:hover {
    border-color: rgba(255,255,255,0.2);
}

.tab-btn-outline.active {
    background-color: #EFDCD1;
    color: #000;
    border-color: #EFDCD1;
    font-weight: 500;
}

.services-accordion-box {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.accordion-item-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 35px 45px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px;
    background: #0c0c0c;
    cursor: pointer;
    transition: all 0.3s ease;
}

.accordion-item-box:hover {
    border-color: rgba(255,255,255,0.15);
}

.accordion-header-box {
    display: flex;
    align-items: center;
    gap: 30px;
}

.accordion-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.accordion-icon svg {
    width: 28px;
    height: 28px;
    stroke: #555;
    stroke-width: 1.2;
}

.accordion-title {
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 0.8px;
}

.accordion-arrow {
    color: rgba(255,255,255,0.2);
}

.accordion-arrow svg {
    width: 24px;
    height: 24px;
}

@media (max-width: 1024px) {
    .services-tabs-row {
        gap: 12px;
        padding: 0 20px;
    }
    .tab-btn-outline {
        padding: 18px 5px;
    }
}

@media (max-width: 768px) {
    .services-tabs-row {
        flex-wrap: wrap;
    }
    .tab-btn-outline {
        flex: 0 0 calc(50% - 6px);
    }
    .accordion-item-box {
        padding: 25px 30px;
    }
}
"""
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines[:start_line])
        f.write(refined_css)
    print('Styles refined and cleaned up.')
else:
    print('Target marker not found.')
