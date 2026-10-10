// =====================================
// 1. GLOBAL VARIABLES
// =====================================

const $ = id => document.getElementById(id);

let current = null;

const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lets CSS hide .reveal elements only when JavaScript is running
document.documentElement.classList.add('js');

const labels = {
    acne: 'Acne',
    dark_circle_v2: 'Dark Circles',
    droopy_lower_eyelid: 'Lower Eyelid',
    droopy_upper_eyelid: 'Upper Eyelid',
    eye_bag: 'Eye Bags',
    firmness: 'Firmness',
    moisture: 'Moisture',
    oiliness: 'Oiliness',
    pore: 'Pores',
    radiance: 'Radiance',
    redness: 'Redness',
    age_spot: 'Age Spots',
    texture: 'Texture',
    wrinkle: 'Wrinkles',
    tear_trough: 'Tear Trough'
};


// =====================================
// 2. PAGE ANIMATIONS
// =====================================

// Fade sections in as they scroll into view
const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
        }
    }
}, {threshold: 0.12, rootMargin: '0px 0px -40px 0px'});

document
    .querySelectorAll('.reveal')
    .forEach(el => revealObserver.observe(el));

// Header shadow after scrolling
const header = $('siteHeader');

if (header) {
    const updateHeader = () =>
        header.classList.toggle('scrolled', window.scrollY > 8);

    window.addEventListener('scroll', updateHeader, {passive: true});
    updateHeader();
}

// Count a number up from 0 to its final value
function countUp(element, target, decimals = 0, suffix = '') {
    if (reduceMotion) {
        element.textContent = target.toFixed(decimals) + suffix;
        return;
    }

    const duration = 1200;
    const start = performance.now();

    function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);

        element.textContent =
            (target * eased).toFixed(decimals) + suffix;

        if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

// Show a value with count-up if numeric, otherwise as text
function setStat(element, value, decimals = 0) {
    const number = Number(value);

    if (value == null || value === '' || !Number.isFinite(number)) {
        element.textContent = value ?? '—';
        return;
    }

    countUp(element, number, decimals);
}

function setLoading(button, loading) {
    if (!button) return;

    button.disabled = loading;
    button.classList.toggle('loading', loading);
}


// =====================================
// 3. SHOW ALERT MESSAGES
// =====================================

function showAlert(type, message) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const element = $('message');

    element.textContent =
        `${icons[type] || 'ℹ️'} ${message}`;

    element.className = `alert alert-${type}`;

    // Restart the slide-in animation for every new message
    element.style.animation = 'none';
    void element.offsetHeight;
    element.style.animation = '';

    // Shake errors and warnings so they get noticed
    if (type === 'error' || type === 'warning') {
        react(element, 'shake');
        react($('dropZone'), 'shake');
    }
}


// =====================================
// 4. FORMAT API ERRORS
// =====================================

function handleApiError(status, data) {
    const raw = String(
        data?.error ||
        data?.message ||
        'Unknown error'
    );

    const message = raw.toLowerCase();

    if (message.includes('resolution')) {
        return 'Image resolution is too low or unsupported. Please check your image dimensions.';
    }

    if (message.includes('face') && message.includes('small')) {
        return 'Your face is too small. It must occupy more than 60% of the image width.';
    }

    if (message.includes('no face') || message.includes('face not detected')) {
        return 'No face detected. Please upload a clear front-facing photograph.';
    }

    if (status === 401) return 'YouCam authentication failed. Check your API key.';
    if (status === 403) return 'YouCam access denied. Check your account permissions.';
    if (status === 413) return 'The image is too large. Maximum size is 8 MB.';
    if (status === 429) return 'Too many requests. Please try again later.';
    if (status === 504) return 'The analysis timed out.';

    return raw;
}


// =====================================
// 5. PHOTO PREVIEW
// =====================================

$('image').addEventListener('change', () => {
    const file = $('image').files[0];

    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showAlert('error', 'Please upload a JPEG or PNG image.');
        $('image').value = '';
        return;
    }

    const url = URL.createObjectURL(file);
    const preview = $('preview');

    preview.replaceChildren();
    preview.classList.remove('scanning');

    const image = document.createElement('img');

    image.alt = 'Uploaded facial photograph';

    image.onload = () => {
        URL.revokeObjectURL(url);
    };

    image.onerror = () => {
        URL.revokeObjectURL(url);
        showAlert('error', 'Unable to preview the photo.');
    };

    image.src = url;
    preview.append(image);

    // Hide previous results
    $('results').classList.add('hidden');
    current = null;

    showAlert('success', 'Photo selected. Click Analyze My Skin.');
});


// Drag and drop onto the upload box
const dropZone = $('dropZone');

if (dropZone) {
    ['dragenter', 'dragover'].forEach(name =>
        dropZone.addEventListener(name, event => {
            event.preventDefault();
            dropZone.classList.add('dragover');
        })
    );

    ['dragleave', 'drop'].forEach(name =>
        dropZone.addEventListener(name, event => {
            event.preventDefault();
            dropZone.classList.remove('dragover');
        })
    );

    dropZone.addEventListener('drop', event => {
        const files = event.dataTransfer?.files;

        if (!files || !files.length) return;

        $('image').files = files;
        $('image').dispatchEvent(new Event('change'));
    });
}


// =====================================
// 6. ANALYZE FORM
// =====================================

$('form').addEventListener('submit', event => {
    event.preventDefault();
    analyzeSkin();
});


// =====================================
// 7. SHOW RESULTS SECTION
// =====================================

function showResults(data) {
    const results = $('results');

    results.classList.remove('hidden');

    // Replay the stat-card entrance animation
    results.classList.remove('animate');
    void results.offsetWidth;
    results.classList.add('animate');

    // Render after the section is visible so bars can animate
    render(data);

    // Celebrate: pop the score card and burst sparkles from it
    const scoreCard = document.querySelector('.stat.dark');
    setTimeout(() => {
        react(scoreCard, 'pop');
        sparkle(scoreCard);
    }, reduceMotion ? 0 : 900);

    results.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth'
    });
}


// =====================================
// 8. TRY DEMO BUTTON
// =====================================

if ($('demo')) {
    $('demo').addEventListener('click', async () => {
        const button = $('demo');

        setLoading(button, true);
        showAlert('info', 'Loading demo results...');

        // Show demo image
        const preview = $('preview');

        preview.replaceChildren();
        preview.classList.remove('scanning');

        const demoImage = document.createElement('img');

        demoImage.src = '/static/images/demo-face.png';
        demoImage.alt = 'Demo face';

        preview.append(demoImage);

        try {
            const formData = new FormData();
            formData.append('demo', '1');

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Demo failed.');
            }

            showResults(data);

            showAlert('success', 'Demo loaded successfully. No API credits used.');

        } catch (error) {
            showAlert('error', error.message);

        } finally {
            setLoading(button, false);
        }
    });
}


// =====================================
// 9. SEND IMAGE TO YOUCAM
// =====================================

async function analyzeSkin() {
    const file = $('image').files[0];

    if (!file) {
        showAlert('warning', 'Please choose a photo first.');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const button = $('submit');
    const preview = $('preview');

    setLoading(button, true);

    if ($('demo')) {
        $('demo').disabled = true;
    }

    preview.classList.add('scanning');

    showAlert('info', 'Uploading your photo and running YouCam analysis...');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert('error', handleApiError(response.status, data));
            return;
        }

        showResults(data);

        showAlert('success', 'Skin analysis completed successfully!');

    } catch (error) {
        console.error('API error:', error);

        showAlert('error', 'Unable to read the server response. Check your Flask terminal.');

    } finally {
        setLoading(button, false);
        preview.classList.remove('scanning');

        if ($('demo')) {
            $('demo').disabled = false;
        }
    }
}


// =====================================
// 10. DISPLAY ANALYSIS RESULTS
// =====================================

function render(result) {
    current = result;

    $('mode').textContent =
        result.demo
            ? 'DEMO · Sample Data'
            : 'LIVE · YouCam Results';

    // Overall score (counts up)
    setStat($('overall'), result.overall, 1);

    // Skin type
    $('skinType').textContent = result.skin_type ?? 'Unknown';

    // Skin age (counts up)
    setStat($('age'), result.skin_age, 0);

    // Concern scores
    renderScores(result.scores || []);

    // AI visualization
    renderMasks(result.masks || []);

    // Daily care advice
    renderAdvice(result.skin_type || '');
}


// =====================================
// 11. DISPLAY SKIN SCORES
// =====================================

function scoreLevel(value) {
    if (value >= 80) return 'good';
    if (value >= 60) return 'fair';
    return 'low';
}

function renderScores(scores) {
    const container = $('scoreRows');

    container.replaceChildren();

    scores.forEach((item, index) => {
        const value = Math.max(0, Math.min(100, Number(item.score) || 0));

        const row = document.createElement('div');
        row.className = `scoreline ${scoreLevel(value)}`;

        const heading = document.createElement('div');
        heading.className = 'scorehead';

        const name = document.createElement('span');
        name.textContent = labels[item.type] || item.type;

        const number = document.createElement('b');
        number.textContent = `0.0/100`;

        heading.append(name, number);

        const track = document.createElement('div');
        track.className = 'track';

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.width = '0%';
        bar.style.transitionDelay = `${index * 60}ms`;

        track.append(bar);
        row.append(heading, track);
        container.append(row);

        // Grow the bar and count the number after layout
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.width = `${value}%`;
            });
        });

        setTimeout(
            () => countUp(number, value, 1, '/100'),
            reduceMotion ? 0 : index * 60
        );
    });
}


// =====================================
// 12. DISPLAY AI VISUALIZATION
// =====================================

function renderMasks(masks) {
    const section = $('visualization');
    const select = $('maskSelect');
    const image = $('maskImage');
    const message = $('maskMessage');

    select.replaceChildren();
    image.removeAttribute('src');
    image.hidden = true;

    function setDailyCareNumber(text) {
        if ($('dailyCareNumber')) {
            $('dailyCareNumber').textContent = text;
        }
    }

    // Demo: no visualization, so Daily Care becomes 03
    if (!masks.length) {
        section.classList.add('hidden');
        setDailyCareNumber('03 / DAILY CARE');
        return;
    }

    // Live: show visualization, Daily Care becomes 04
    section.classList.remove('hidden');
    setDailyCareNumber('04 / DAILY CARE');

    for (const mask of masks) {
        if (!mask.url) continue;

        const option = document.createElement('option');
        option.value = mask.url;
        option.textContent = labels[mask.type] || mask.type;

        select.append(option);
    }

    // No valid URLs
    if (!select.options.length) {
        section.classList.add('hidden');
        setDailyCareNumber('03 / DAILY CARE');
        return;
    }

    function displayMask() {
        const url = select.value;

        if (!url) return;

        image.hidden = true;
        message.textContent = 'Loading visualization...';

        image.onload = () => {
            image.hidden = false;

            // Replay the fade-in each time a new mask loads
            image.style.animation = 'none';
            void image.offsetHeight;
            image.style.animation = '';

            message.textContent =
                'Showing: ' + select.selectedOptions[0].textContent;
        };

        image.onerror = () => {
            image.hidden = true;
            message.textContent =
                'Visualization unavailable. The image URL may have expired.';
        };

        image.src = url;
    }

    select.onchange = displayMask;
    displayMask();
}


// =====================================
// 13. SKINCARE SUGGESTIONS
// =====================================

function renderAdvice(skinType) {
    const type = skinType.toLowerCase();
    const advice = $('advice');

    if (type.includes('oily')) {
        advice.textContent =
            'Your skin is classified as oily. ' +
            'Consider a gentle cleanser, lightweight ' +
            'non-comedogenic moisturizer, and daily sunscreen.';

    } else if (type.includes('dry')) {
        advice.textContent =
            'Your skin is classified as dry. ' +
            'Try gentle cleansing, fragrance-free moisturizer, ' +
            'and daily broad-spectrum sunscreen.';

    } else if (type.includes('combination')) {
        advice.textContent =
            'Your skin is classified as combination skin. ' +
            'Consider gentle cleansing, lightweight moisturizer, ' +
            'and daily sunscreen. Adjust products for oily and dry areas.';

    } else if (type.includes('normal')) {
        advice.textContent =
            'Your skin is classified as normal. ' +
            'Maintain gentle cleansing, regular moisturizing, ' +
            'and daily broad-spectrum sunscreen.';

    } else {
        advice.textContent =
            'Consider gentle cleansing, regular moisturizing, ' +
            'and daily sunscreen. Patch-test new products.';
    }
}


// =====================================
// 14. REACTION ANIMATIONS
// =====================================

const finePointer =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Replay a one-shot animation class on an element
function react(element, className) {
    if (!element || reduceMotion) return;

    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);

    element.addEventListener(
        'animationend',
        () => element.classList.remove(className),
        {once: true}
    );
}

// Click ripple from the exact point you clicked
document.addEventListener('pointerdown', event => {
    if (reduceMotion) return;

    const target = event.target.closest('button, .cta, .stat, .drop');
    if (!target || target.disabled) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    target.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
});

// Spotlight glow that follows the mouse on panels and cards
document.addEventListener('pointermove', event => {
    const card = event.target.closest('.panel, .stat');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
});

// Gentle 3D tilt on the stat cards and photo preview
if (finePointer && !reduceMotion) {
    document.querySelectorAll('.stat, .preview').forEach(card => {
        card.classList.add('tilt');
        const max = card.classList.contains('preview') ? 5 : 8;

        card.addEventListener('pointermove', event => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;

            card.style.transform =
                `perspective(800px) rotateX(${-y * max}deg) ` +
                `rotateY(${x * max}deg) translateY(-4px)`;
        });

        card.addEventListener('pointerleave', () => {
            card.style.transition = 'transform 0.5s var(--ease)';
            card.style.transform = '';
            setTimeout(() => (card.style.transition = ''), 500);
        });
    });
}

// Burst of sparkles from an element
function sparkle(element) {
    if (!element || reduceMotion) return;

    const rect = element.getBoundingClientRect();
    const colors = ['#E3F2FD', '#90CAF9', '#2196F3', '#0D47A1'];
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < 22; i++) {
        const dot = document.createElement('span');
        const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
        const distance = 80 + Math.random() * 90;

        dot.className = 'spark';
        dot.style.left = `${cx}px`;
        dot.style.top = `${cy}px`;
        dot.style.background = colors[i % colors.length];
        dot.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        dot.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        dot.style.animationDelay = `${Math.random() * 120}ms`;

        document.body.append(dot);
        dot.addEventListener('animationend', () => dot.remove());
    }
}

// Highlight the nav link for the section on screen
const navLinks = [...document.querySelectorAll('nav a')];

const navObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        navLinks.forEach(link =>
            link.classList.toggle(
                'active',
                link.getAttribute('href') === `#${entry.target.id}`
            )
        );
    }
}, {rootMargin: '-45% 0px -50% 0px'});

['analyze', 'results', 'visualization']
    .map(id => $(id))
    .filter(Boolean)
    .forEach(section => navObserver.observe(section));
