css = """
/* Refined Services Details Section */
.services-details-section {
    background-color: #0d0d0d; /* Slightly lighter than pure black hero */
    padding: 80px 0 120px;
}

.services-tabs-row {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 50px;
}

.tab-btn-outline {
    flex: 1;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 4px;
    padding: 22px 10px;
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 14px;
    font-weight: 300;
    cursor: pointer;
    text-transform: none;
    letter-spacing: 0.5px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
}

/* Screenshot shows first button is uppercase, others are not (or mixed) */
.tab-btn-outline:nth-child(1) { text-transform: uppercase; }

.tab-btn-outline:hover {
    border-color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.02);
}

.tab-btn-outline.active {
    background-color: #EFDCD1;
    color: #000;
    border-color: #EFDCD1;
    font-weight: 500;
}

.services-accordion-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.accordion-item-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28px 32px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: all 0.3s ease;
}

.accordion-item-box:hover {
    border-color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.02);
}

.accordion-header-box {
    display: flex;
    align-items: center;
    gap: 24px;
}

.accordion-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.accordion-icon svg {
    width: 24px;
    height: 24px;
    stroke: #888;
}

.accordion-title {
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 300;
    letter-spacing: 0.5px;
}

.accordion-arrow {
    color: rgba(255,255,255,0.3);
    transition: transform 0.3s ease;
}

.accordion-item-box.is-open .accordion-arrow {
    transform: rotate(180deg);
}

@media (max-width: 1024px) {
    .services-tabs-row {
        flex-wrap: wrap;
        gap: 10px;
    }
    .tab-btn-outline {
        flex: 0 0 calc(50% - 5px);
        padding: 18px 5px;
        font-size: 13px;
    }
}

@media (max-width: 600px) {
    .tab-btn-outline {
        flex: 0 0 100%;
    }
    .accordion-item-box {
        padding: 20px;
    }
    .accordion-header-box {
        gap: 15px;
    }
}
"""

with open('styles.css', 'a', encoding='utf-8') as f:
    f.write(css)

print("Final CSS polish applied.")
