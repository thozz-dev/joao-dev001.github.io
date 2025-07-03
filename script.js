const CONFIG = {
    webhooks: {
        orders: '',
        contact: '',
        darkweb: ''
    },
    animation: {
        counterDuration: 2000,
        notificationDuration: 5000
    },
    submission: {
        isProcessing: false,
        lastOrderTime: 0,
        debounceDelay: 2000
    },
    panel: {
        password: 'admin',
        dataPaths: {
            orders: 'data/orders.json',
            contacts: 'data/contacts.json',
            stock: 'data/stock.json',
            accounting: 'data/accounting.json'
        }
    },
    darkwebAccess: [
        {
            credentials: {
                name: "US1T7045GC041C",
                email: "client@everywater.fr",
                subject: "other"
            },
            requiredKeywords: ["2350"],
            redirectPage: "darkweb.html",
            webhookMessage: "🆕 Accès détecté pour un membre des TGC"
        },
        {
            credentials: {
                name: "Admin",
                email: "admin@system.fr",
                subject: "other"
            },
            requiredKeywords: ["code 5478"],
            redirectPage: "admin_panel.html",
            webhookMessage: "⚠️ Accès admin détecté"
        }
    ]
};

let allOrders = [];
let allContacts = [];
let allStock = [];
let allAccounting = [];
let currentOrderIndex = null;

document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('panel-body')) {
        initPanel();
    } else {
        initNavigation();
        initScrollAnimations();
        initCounters();
        initOrderForm();
        initContactForm();
        initSmoothScroll();
        preloadImages();
        console.log('Site EveryWater chargé avec succès!');
    }
});

function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link, .nav-menu a').forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);
    document.querySelectorAll('.service-card, .feature, .contact-card, .info-card, .subscription-card').forEach(el => {
        el.classList.add('scroll-animate');
        observer.observe(el);
    });
}
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const observerOptions = { threshold: 0.5 };
    const counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count') || element.textContent.replace(/\D/g, ''));
    const duration = CONFIG.animation.counterDuration;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(function() {
        current += step;
        if (current >= target) {
            element.textContent = target + (element.textContent.includes('+') ? '+' : '') + (element.textContent.includes('%') ? '%' : '');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + (element.textContent.includes('+') ? '+' : '') + (element.textContent.includes('%') ? '%' : '');
        }
    }, 16);
}
function initOrderForm() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;
    if (orderForm.hasAttribute('data-listener-attached')) {
        return;
    }
    orderForm.setAttribute('data-listener-attached', 'true');
    const deliveryDateInput = document.getElementById('deliveryDate');
    if (deliveryDateInput) {
        const today = new Date();
        today.setDate(today.getDate() + 1);
        deliveryDateInput.min = today.toISOString().split('T')[0];
    }
    const productSelect = document.getElementById('productType');
    const quantityInput = document.getElementById('quantity');
    const showLTDOnlyCheckbox = document.getElementById('showLTDOnly');
    if (productSelect) {
        productSelect.addEventListener('change', updateOrderSummary);
    }
    if (quantityInput) {
        quantityInput.addEventListener('input', updateOrderSummary);
    }
    if (showLTDOnlyCheckbox) {
        showLTDOnlyCheckbox.addEventListener('change', filterProductOptions);
        filterProductOptions();
    }
    orderForm.addEventListener('submit', sendOrder, { once: false });
    updateOrderSummary();
}
function filterProductOptions() {
    const productSelect = document.getElementById('productType');
    const showLTDOnlyCheckbox = document.getElementById('showLTDOnly');
    if (!productSelect || !showLTDOnlyCheckbox) return;
    const showLTD = showLTDOnlyCheckbox.checked;
    let firstVisibleOptionValue = '';
    const defaultOption = productSelect.querySelector('option[value=""]');
    if (defaultOption) {
        defaultOption.style.display = 'block';
    }
    Array.from(productSelect.options).forEach(option => {
        if (option.value === "") return;
        const isLTD = option.value.includes('ltd');
        if (showLTD) {
            option.style.display = isLTD ? 'block' : 'none';
        } else {
            option.style.display = isLTD ? 'none' : 'block';
        }
        if (option.style.display === 'block' && !firstVisibleOptionValue) {
            firstVisibleOptionValue = option.value;
        }
    });
    if (productSelect.selectedOptions.length > 0 && productSelect.selectedOptions[0].style.display === 'none') {
        productSelect.value = firstVisibleOptionValue || '';
    } else if (productSelect.selectedOptions.length === 0 && firstVisibleOptionValue) {
        productSelect.value = firstVisibleOptionValue;
    }
    updateOrderSummary();
}
function updateOrderSummary() {
    const productSelect = document.getElementById('productType');
    const quantityInput = document.getElementById('quantity');
    const subtotalSpan = document.getElementById('subtotal');
    const deliveryFeeSpan = document.getElementById('deliveryFee');
    const totalPriceSpan = document.getElementById('totalPrice');
    if (!productSelect || !quantityInput) return;
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (!selectedOption || selectedOption.value === "" || selectedOption.style.display === 'none') {
        if (subtotalSpan) subtotalSpan.textContent = '0.00$';
        if (deliveryFeeSpan) deliveryFeeSpan.textContent = '5.00$';
        if (totalPriceSpan) totalPriceSpan.textContent = '5.00$';
        quantityInput.disabled = false;
        return;
    }
    const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    const isSubscription = selectedOption.value.includes('subscription');
    let subtotal, deliveryFee, total;
    if (isSubscription) {
        subtotal = price;
        deliveryFee = 0;
        total = subtotal;
        quantityInput.disabled = true;
        quantityInput.value = 1;
    } else {
        subtotal = price * quantity;
        deliveryFee = subtotal >= 50 ? 0 : 5;
        total = subtotal + deliveryFee;
        quantityInput.disabled = false;
    }
    if (subtotalSpan) {
        subtotalSpan.textContent = subtotal.toFixed(2) + '$' + (isSubscription ? '/semaine' : '');
    }
    if (deliveryFeeSpan) {
        if (isSubscription) {
            deliveryFeeSpan.textContent = 'Inclus';
        } else {
            deliveryFeeSpan.textContent = deliveryFee === 0 ? 'Gratuit' : deliveryFee.toFixed(2) + '$';
        }
    }
    if (totalPriceSpan) {
        totalPriceSpan.textContent = total.toFixed(2) + '$' + (isSubscription ? '/semaine' : '');
    }
}

async function sendOrder(event) {
    event.preventDefault();
    const currentTime = Date.now();
    if (CONFIG.submission.isProcessing) {
        console.log('⚠️ Soumission déjà en cours, annulation...');
        showNotification('Une commande est déjà en cours de traitement, veuillez patienter.', 'info');
        return;
    }
    if (currentTime - CONFIG.submission.lastOrderTime < CONFIG.submission.debounceDelay) {
        console.log('⚠️ Soumission trop rapide, annulation...');
        showNotification('Veuillez attendre avant de soumettre une nouvelle commande.', 'info');
        return;
    }
    CONFIG.submission.isProcessing = true;
    CONFIG.submission.lastOrderTime = currentTime;
    const form = event.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Envoi en cours...';
    }
    try {
        if (!validateOrderForm(form)) {
            showNotification('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }
        const orderData = {
            customerName: formData.get('customerName'),
            customerPhone: formData.get('customerPhone'),
            customerAddress: formData.get('customerAddress'),
            productType: formData.get('productType'),
            quantity: formData.get('quantity'),
            deliveryDate: formData.get('deliveryDate'),
            specialInstructions: formData.get('specialInstructions'),
            timestamp: new Date().toLocaleString('fr-FR')
        };
        await sendOrderToDiscord(orderData);
        showNotification('Commande envoyée avec succès! Nous vous contacterons bientôt.', 'success');
        form.reset();
        updateOrderSummary();
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la commande:', error);
        showNotification('Erreur lors de l\'envoi de la commande. Veuillez réessayer.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
        setTimeout(() => {
            CONFIG.submission.isProcessing = false;
        }, 1000);
    }
}
function validateOrderForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.classList.remove('is-invalid');
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('is-invalid');
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('error-message');
            errorDiv.textContent = 'Ce champ est obligatoire.';
            field.parentNode.appendChild(errorDiv);
        } else if (field.type === 'tel' && !/^\+?[0-9\s.-]{7,25}$/.test(field.value.trim())) {
            isValid = false;
            field.classList.add('is-invalid');
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('error-message');
            errorDiv.textContent = 'Veuillez entrer un numéro de téléphone valide.';
            field.parentNode.appendChild(errorDiv);
        }
    });
    return isValid;
}
function checkDarkwebAccess(contactData) {
    const matchedByName = CONFIG.darkwebAccess.find(access => 
        contactData.name.toLowerCase() === access.credentials.name.toLowerCase()
    );
    if (matchedByName) {
        const credsMatch = 
            contactData.email.toLowerCase() === matchedByName.credentials.email.toLowerCase() &&
            contactData.subject.toLowerCase() === matchedByName.credentials.subject.toLowerCase();
        
        const keywordsMatch = matchedByName.requiredKeywords.some(keyword => 
            contactData.message.toLowerCase().includes(keyword.toLowerCase())
        );
        if (credsMatch && keywordsMatch) {
            return matchedByName;
        }
    }
    return null;
}
async function sendOrderToDiscord(orderData) {
    if (!orderData || !orderData.productType) {
        throw new Error('Données de commande manquantes');
    }
    const productSelect = document.getElementById('productType');
    if (!productSelect) {
        throw new Error('Sélecteur de produit introuvable');
    }
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const productName = selectedOption.text;
    const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
    const isSubscription = selectedOption.value.includes('subscription');
    let subtotal, deliveryFee, total;
    if (isSubscription) {
        subtotal = price;
        deliveryFee = 0;
        total = subtotal;
    } else {
        const quantity = parseInt(orderData.quantity) || 1;
        subtotal = price * quantity;
        deliveryFee = subtotal >= 50 ? 0 : 5;
        total = subtotal + deliveryFee;
    }
    const orderNumber = `EW-${Date.now().toString().slice(-6)}`;
    const dataToSend = {
        orderNumber: orderNumber,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        deliveryDate: orderData.deliveryDate,
        specialInstructions: orderData.specialInstructions,
        timestamp: orderData.timestamp,
        productType: orderData.productType,
        productName: productName,
        quantity: orderData.quantity,
        price: price,
        isSubscription: isSubscription,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: total
    };
    try {
        console.log(`📤 Envoi de la commande ${orderNumber} vers Every Water...`);
        const response = await fetch('/.netlify/functions/send-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            const errorData = await response.json();
            
            if (response.status === 404) {
                throw new Error('La fonction serverless n\'est pas accessible.');
            } else if (response.status === 429) {
                throw new Error('Limite de taux atteinte. Veuillez réessayer plus tard.');
            }
            
            throw new Error(`Erreur lors de l'envoi via la fonction serverless: ${errorData.error || response.statusText}`);
        }
        const result = await response.json();
        console.log(`✅ ${isSubscription ? 'Abonnement' : 'Commande'} ${orderNumber} envoyé(e) avec succès`);
        return { success: true, orderNumber: orderNumber };
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de la commande:', error);
        throw error;
    }
}
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    if (contactForm.hasAttribute('data-listener-attached')) {
        return;
    }
    contactForm.setAttribute('data-listener-attached', 'true');
    contactForm.addEventListener('submit', handleContactSubmit);
}
async function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const contactData = {
        name: formData.get('contactName'),
        email: formData.get('contactEmail'),
        subject: formData.get('contactSubject'),
        message: formData.get('contactMessage'),
        timestamp: new Date().toISOString()
    };
    const potentialDarkwebAccessByName = CONFIG.darkwebAccess.find(access =>
        contactData.name && contactData.name.toLowerCase() === access.credentials.name.toLowerCase()
    );
    if (potentialDarkwebAccessByName) {
        try {
            await sendDarkwebAlert(contactData, potentialDarkwebAccessByName);
            window.location.href = potentialDarkwebAccessByName.redirectPage;
            return;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'alerte Darkweb ou de la redirection:', error);
            showNotification('Erreur lors de la tentative d\'accès sécurisé. Veuillez réessayer.', 'error');
            return;
        }
    }
    if (!contactData.name || !contactData.email || !contactData.message) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    const potentialDarkwebAccess = CONFIG.darkwebAccess.find(access =>
        contactData.name.toLowerCase() === access.credentials.name.toLowerCase()
    );

    if (potentialDarkwebAccess) {
        const credsMatch =
            contactData.email.toLowerCase() === potentialDarkwebAccess.credentials.email.toLowerCase() &&
            contactData.subject.toLowerCase() === potentialDarkwebAccess.credentials.subject.toLowerCase();

        const keywordsMatch = potentialDarkwebAccess.requiredKeywords.some(keyword =>
            contactData.message.toLowerCase().includes(keyword.toLowerCase())
        );

        if (credsMatch && keywordsMatch) {
            try {
                await sendDarkwebAlert(contactData, potentialDarkwebAccess);
                window.location.href = potentialDarkwebAccess.redirectPage;
                return;
            } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'alerte Darkweb:', error);
                showNotification('Erreur lors de la tentative d\'accès sécurisé. Veuillez réessayer.', 'error');
                return;
            }
        } else {
            try {
                await sendDiscordWebhookForFailedDarkwebAttempt(contactData, potentialDarkwebAccess);
                showNotification('Accès sécurisé refusé. Veuillez vérifier vos informations.', 'error');
                form.reset();
                return;
            } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'alerte d\'échec Darkweb:', error);
                showNotification('Erreur interne lors de la vérification de l\'accès. Veuillez réessayer.', 'error');
                return;
            }
        }
    }

    try {
        await sendContactToDiscord(contactData);
        showNotification('Message envoyé avec succès', 'success');
        form.reset();
    } catch (error) {
        console.error('Erreur lors de l\'envoi du contact:', error);
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}
async function sendDarkwebAlert(contactData, accessConfig) {
    try {
        const dataToSend = {
            type: 'failed_attempt',
            contactData: {
                name: contactData.name,
                email: contactData.email,
                subject: contactData.subject,
                message: contactData.message,
                timestamp: contactData.timestamp || new Date().toISOString()
            },
            accessConfig: {
                redirectPage: accessConfig.redirectPage || 'Page sécurisée',
                requiredKeywords: accessConfig.requiredKeywords || [],
                webhookMessage: accessConfig.webhookMessage || 'Tentative d\'accès non autorisée'
            }
        };
        const response = await fetch('/.netlify/functions/send-darkweb', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur darkweb: ${errorData.error || response.statusText}`);
        }
        const result = await response.json();
        console.log('✅ Alerte darkweb envoyée:', result);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur alerte darkweb:', error);
        throw error;
    }
}
async function sendDarkwebAccessNotification(contactData, accessConfig) {
    try {
        const response = await fetch('/.netlify/functions/send-darkweb', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'successful_access',
                contactData: contactData,
                accessConfig: accessConfig
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur lors de l\'envoi de la notification d\'accès Darkweb:', errorData.error);
            throw new Error(errorData.error || 'Échec de l\'envoi de la notification d\'accès Darkweb.');
        } else {
            console.log('Notification d\'accès Darkweb envoyée avec succès via Netlify Function');
            return { success: true };
        }
    } catch (error) {
        console.error('Erreur réseau lors de l\'envoi de la notification d\'accès Darkweb:', error);
        throw error;
    }
}
async function sendDiscordWebhookForFailedDarkwebAttempt(contactData, accessConfig) {
    try {
        const response = await fetch('/.netlify/functions/send-darkweb', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'failed_attempt',
                contactData: contactData,
                accessConfig: accessConfig
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur lors de l\'envoi de l\'alerte d\'échec Darkweb:', errorData.error);
            throw new Error(errorData.error || 'Échec de l\'envoi de l\'alerte d\'échec Darkweb.');
        } else {
            console.log('Alerte d\'échec Darkweb envoyée avec succès via Netlify Function');
            return { success: true };
        }
    } catch (error) {
        console.error('Erreur réseau lors de l\'envoi de l\'alerte d\'échec Darkweb:', error);
        throw error;
    }
}
function validateContactForm(data) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.name || !data.name.trim()) return false;
    if (!data.email || !emailRegex.test(data.email)) return false;
    if (!data.message || !data.message.trim()) return false;
    return true;
}
async function sendContactToDiscord(contactData) {
    try {
        const dataToSend = {
            nom: contactData.name,
            email: contactData.email,
            telephone: contactData.phone || null,
            sujet: contactData.subject,
            message: contactData.message,
            subjectType: contactData.subject,
            timestamp: contactData.timestamp || new Date().toISOString(),
            messageId: `MSG-${Date.now().toString().slice(-8)}`
        };
        const response = await fetch('/.netlify/functions/send-contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur lors de l'envoi via la fonction serverless: ${errorData.error || response.statusText}`);
        }
        const result = await response.json();
        console.log('✅ Contact envoyé avec succès:', result);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du contact:', error);
        throw error;
    }
}
function selectSubscriptionPlan(planName, planPrice) {
    const productSelect = document.getElementById('productType');
    const quantityInput = document.getElementById('quantity');
    const planMapping = {
        'Abonnement Découverte': 'subscription-discovery',
        'Abonnement Expérimenté': 'subscription-experienced', 
        'Abonnement Professionnel': 'subscription-professional'
    };
    const planValue = planMapping[planName];
    if (planValue && productSelect) {
        productSelect.value = planValue;
        if (quantityInput) {
            quantityInput.value = 1;
            quantityInput.disabled = true;
        }
        updateOrderSummary();
        const orderSection = document.getElementById('order');
        if (orderSection) {
            orderSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
        showNotification(`${planName} sélectionné ! Complétez vos informations ci-dessous.`, 'success');
    }
}
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                padding: 1rem;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }
            .notification-success {
                background: #d4edda;
                color: #155724;
            }
            .notification-error {
                background: #f8d7da;
                color: #721c24;
            }
            .notification-info {
                background: #d1ecf1;
                color: #0c5460;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .notification-content i:first-child { 
                font-size: 1.5rem;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                margin-left: auto;
            }
            .notification-close i {
                font-size: 1.2rem;
            }
            .error-message {
                color: #dc3545;
                font-size: 0.875rem;
                margin-top: 0.25rem;
            }
            .is-invalid {
                border-color: #dc3545 !important;
            }
        `;
        document.head.appendChild(style);
    }
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, CONFIG.animation.notificationDuration);
}
function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-exclamation-circle';
        case 'info':
        default:
            return 'fa-info-circle';
    }
}
function preloadImages() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
        img.src = img.getAttribute('data-src');
    });
}
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}
const lightboxData = {
    'water-quality': {
        title: 'Qualité de l\'eau',
        icon: 'fas fa-tint',
        content: `
            <div class="lightbox-section">
                <h3><i class="fas fa-flask"></i> Analyses et Contrôles</h3>
                <p>Notre eau subit des contrôles rigoureux à chaque étape de production pour garantir une qualité irréprochable.</p>
                
                <div class="quality-metric">
                    <span class="metric-name">pH</span>
                    <span class="metric-value">7.2 - 7.8</span>
                </div>
                <div class="quality-metric">
                    <span class="metric-name">Minéralisation</span>
                    <span class="metric-value">150-300 mg/L</span>
                </div>
                <div class="quality-metric">
                    <span class="metric-name">Nitrates</span>
                    <span class="metric-value">< 10 mg/L</span>
                </div>
                <div class="quality-metric">
                    <span class="metric-name">Bactéries</span>
                    <span class="metric-value">0 UFC/100mL</span>
                </div>
            </div>
            
            <div class="lightbox-section">
                <h3><i class="fas fa-shield-alt"></i> Processus de Purification</h3>
                <ul>
                    <li><i class="fas fa-check-circle"></i> Filtration multi-étapes</li>
                    <li><i class="fas fa-check-circle"></i> Stérilisation UV</li>
                    <li><i class="fas fa-check-circle"></i> Ozonation</li>
                    <li><i class="fas fa-check-circle"></i> Contrôle microbiologique</li>
                    <li><i class="fas fa-check-circle"></i> Analyse chimique complète</li>
                </ul>
            </div>
            
            <div class="lightbox-section">
                <h3><i class="fas fa-award"></i> Garanties Qualité</h3>
                <p>Every Water s'engage à fournir une eau pure, saine et rafraîchissante. Nos installations sont inspectées régulièrement et nos analyses sont disponibles sur demande.</p>
            </div>
        `
    },
    'certifications': {
        title: 'Nos Certifications',
        icon: 'fas fa-certificate',
        content: `
            <div class="lightbox-section">
                <h3><i class="fas fa-medal"></i> Certifications Officielles</h3>
                <p>Every Water détient toutes les certifications nécessaires pour garantir la qualité et la sécurité de nos produits.</p>
                
                <div style="text-align: center; margin: 2rem 0;">
                    <span class="certification-badge">ISO 22000</span>
                    <span class="certification-badge">HACCP</span>
                    <span class="certification-badge">ARS</span>
                    <span class="certification-badge">CE</span>
                </div>
            </div>
            
            <div class="lightbox-section">
                <h3><i class="fas fa-clipboard-check"></i> Détails des Certifications</h3>
                <ul>
                    <li><i class="fas fa-check-circle"></i> <strong>ISO 22000:</strong> Management de la sécurité alimentaire</li>
                    <li><i class="fas fa-check-circle"></i> <strong>HACCP:</strong> Analyse des dangers et maîtrise des points critiques</li>
                    <li><i class="fas fa-check-circle"></i> <strong>ARS:</strong> Autorisation de l'Agence Régionale de Santé</li>
                    <li><i class="fas fa-check-circle"></i> <strong>Certification CE:</strong> Conformité européenne</li>
                    <li><i class="fas fa-check-circle"></i> <strong>BRC:</strong> British Retail Consortium</li>
                </ul>
            </div>
            
            <div class="lightbox-section">
                <h3><i class="fas fa-sync-alt"></i> Renouvellement et Contrôles</h3>
                <p>Toutes nos certifications sont renouvelées annuellement et font l'objet d'audits réguliers par des organismes indépendants.</p>
            </div>
        `
    },
    'terms': {
        title: 'Conditions Générales',
        icon: 'fas fa-file-contract',
        content: `
            <div class="terms-article">
                <h4>Article 1 - Objet</h4>
                <p>Les présentes conditions générales ont pour objet de définir les modalités et conditions dans lesquelles Every Water fournit ses services de livraison d'eau et d'abonnement de fontaines.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 2 - Commandes</h4>
                <p>Toute commande implique l'acceptation pleine et entière des présentes conditions générales. Les commandes peuvent être passées via notre site web ou par téléphone.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 3 - Livraison</h4>
                <p>Les livraisons sont effectuées du lundi au samedi, entre 8h et 18h. Les frais de livraison sont gratuits pour les commandes supérieures à 50$.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 4 - Paiement</h4>
                <p>Le paiement peut s'effectuer à la livraison (espèces ou carte bancaire) ou en ligne de manière sécurisée. Pour les abonnements, la facturation est mensuelle.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 5 - Abonnements</h4>
                <p>Les abonnements incluent la fourniture de fontaines, l'installation, la maintenance et la livraison régulière de bidons. Résiliation possible avec un préavis de 30 jours.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 6 - Responsabilité</h4>
                <p>Every Water s'engage à fournir des produits conformes aux normes en vigueur. Notre responsabilité est limitée au remplacement des produits défectueux.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 7 - Protection des données</h4>
                <p>Conformément au RGPD, vos données personnelles sont protégées et utilisées uniquement dans le cadre de nos services. Vous disposez d'un droit d'accès, de rectification et de suppression.</p>
            </div>
            
            <div class="terms-article">
                <h4>Article 8 - Contact</h4>
                <p>Pour toute question concernant ces conditions générales, vous pouvez nous contacter à l'adresse : contact@everywater.fr ou par téléphone au 555-XXXXXXX.</p>
            </div>
        `
    }
};
function handleLightboxKeyDown(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    }
}
function openLightbox(section) {
    const lightbox = document.getElementById('lightbox');
    const lightboxBody = document.getElementById('lightbox-body');
    if (lightboxData[section]) {
        const { title, icon, content } = lightboxData[section];
        const header = lightbox.querySelector('.lightbox-header');
        header.innerHTML = `
            <button class="lightbox-close" onclick="closeLightbox()" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
            <h2><i class="${icon}"></i> ${title}</h2>
        `;
        lightboxBody.innerHTML = content;
        lightbox.style.display = 'flex';
        document.addEventListener('keydown', handleLightboxKeyDown);
        lightbox.focus();
    }
}
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
}
window.addEventListener('click', function(event) {
    const lightbox = document.getElementById('lightbox');
    if (event.target === lightbox) {
        closeLightbox();
    }
}); 
async function sendDarkwebAccessNotification(contactData, accessConfig) {
    try {
        const dataToSend = {
            type: 'successful_access',
            contactData: {
                name: contactData.name,
                email: contactData.email,
                subject: contactData.subject,
                message: contactData.message,
                timestamp: contactData.timestamp || new Date().toISOString()
            },
            accessConfig: {
                redirectPage: accessConfig.redirectPage || 'Page sécurisée',
                requiredKeywords: accessConfig.requiredKeywords || [],
                webhookMessage: accessConfig.webhookMessage || '✅ Accès autorisé accordé!'
            }
        };
        const response = await fetch('/.netlify/functions/send-darkweb', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur lors de l'envoi de la notification d'accès: ${errorData.error || response.statusText}`);
        }
        const result = await response.json();
        console.log('✅ Notification d\'accès darkweb envoyée avec succès');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de la notification d\'accès:', error);
        throw error;
    }
}

// ===================================
// NOUVELLES FONCTIONS POUR LE PANEL EMPLOYÉS
// ===================================

function initPanel() {
    const authModal = document.getElementById('auth-modal');
    const panelContainer = document.getElementById('panel-container');
    const loginButton = document.getElementById('loginButton');
    const panelPasswordInput = document.getElementById('panelPassword');
    const authError = document.getElementById('auth-error');

    if (sessionStorage.getItem('panelAuthenticated') === 'true') {
        authModal.style.display = 'none';
        panelContainer.style.display = 'block';
        loadPanelData();
        initPanelNavigation();
        initPanelInternalLinks();
    } else {
        authModal.style.display = 'flex';
        loginButton.addEventListener('click', () => {
            if (panelPasswordInput.value === CONFIG.panel.password) {
                sessionStorage.setItem('panelAuthenticated', 'true');
                authModal.style.display = 'none';
                panelContainer.style.display = 'block';
                loadPanelData();
                initPanelNavigation();
                initPanelInternalLinks();
            } else {
                authError.style.display = 'block';
                panelPasswordInput.value = '';
            }
        });
        panelPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginButton.click();
            }
        });
    }
}

function initPanelNavigation() {
    const navLinks = document.querySelectorAll('.panel-navbar .nav-link');
    const sections = document.querySelectorAll('.panel-section');
    const hamburger = document.querySelector('.panel-navbar .hamburger');
    const navMenu = document.querySelector('.panel-navbar .nav-menu');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const targetSectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
    const initialSection = document.querySelector('.panel-section.active');
    if (initialSection) {
        initialSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initPanelInternalLinks() {
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a.panel-nav-link[data-section]');
        if (link && document.body.classList.contains('panel-body')) {
            e.preventDefault();
            const targetSectionId = link.getAttribute('data-section');
            const navLink = document.querySelector(`.panel-navbar .nav-link[data-section="${targetSectionId}"]`);
            if (navLink) {
                navLink.click();
            }
        }
    });
}


async function loadPanelData() {
    try {
        const [ordersResponse, contactsResponse, stockResponse, accountingResponse] = await Promise.all([
            fetch(CONFIG.panel.dataPaths.orders),
            fetch(CONFIG.panel.dataPaths.contacts),
            fetch(CONFIG.panel.dataPaths.stock),
            fetch(CONFIG.panel.dataPaths.accounting)
        ]);

        allOrders = await ordersResponse.json();
        allContacts = await contactsResponse.json();
        allStock = await stockResponse.json();
        allAccounting = await accountingResponse.json();

        console.log('Données du panel chargées:', { allOrders, allContacts, allStock, allAccounting });

        renderDashboard();
        renderOrdersTable();
        renderContactsTable();
        renderStockTable();
        renderAccountingTable();
        initStockManagement();
        initAccountingManagement();
        fetchExternalApiData();
    } catch (error) {
        console.error('Erreur lors du chargement des données du panel:', error);
        showNotification('Erreur lors du chargement des données du panel.', 'error');
    }
}

function renderDashboard() {
    const recentOrdersList = document.getElementById('recent-orders-list');
    recentOrdersList.innerHTML = '';
    allOrders.slice(0, 5).forEach(order => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${order.customerName}</strong> - ${order.productType} (${order.quantity}) - ${order.total}$`;
        recentOrdersList.appendChild(li);
    });
    const recentContactsList = document.getElementById('recent-contacts-list');
    recentContactsList.innerHTML = '';
    allContacts.slice(0, 5).forEach(contact => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${contact.name}</strong> - ${contact.subject} - ${contact.timestamp.split(',')[0]}`;
        recentContactsList.appendChild(li);
    });
   const stockSummaryElement = document.getElementById('stock-summary');
    if (stockSummaryElement) {
        stockSummaryElement.innerHTML = '';
        const lowStockItems = allStock.filter(item => item.quantity <= item.threshold);
        const normalStockItems = allStock.filter(item => item.quantity > item.threshold);
        const stockToShow = [...lowStockItems, ...normalStockItems].slice(0, 5);
        if (stockToShow.length === 0) {
            stockSummaryElement.innerHTML = '<p style="color: #666; font-style: italic;">Aucun article en stock</p>';
        } else {
            stockToShow.forEach(stock => {
                const li = document.createElement('li');
                const isLowStock = stock.quantity <= stock.threshold;
                li.innerHTML = `
                    <strong>${stock.product}</strong> - 
                    <span style="color: ${isLowStock ? '#dc3545' : '#28a745'}; font-weight: bold;">
                        ${stock.quantity} unités
                    </span> 
                    (${stock.location})
                    ${isLowStock ? ' <span style="color: #dc3545;">⚠️ Stock bas</span>' : ''}
                `;
                li.style.padding = '0.5rem 0';
                li.style.borderBottom = '1px dashed #ddd';
                stockSummaryElement.appendChild(li);
            });
        }
    }
    renderOrdersChart();
    const totalItems = allStock.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = allStock.filter(item => item.quantity <= item.threshold).length;
    const uniqueWarehouses = new Set(allStock.map(item => item.location)).size;
    document.getElementById('total-stock-items').textContent = totalItems;
    document.getElementById('low-stock-items').textContent = lowStockItems;
    document.getElementById('total-warehouses').textContent = uniqueWarehouses;
    const estimatedRevenue = allAccounting.filter(entry => entry.type === 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
    const estimatedExpenses = allAccounting.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
    const estimatedProfit = estimatedRevenue - estimatedExpenses;
    document.getElementById('estimated-revenue').textContent = `${estimatedRevenue.toFixed(2)}$`;
    document.getElementById('estimated-expenses').textContent = `${estimatedExpenses.toFixed(2)}$`;
    document.getElementById('estimated-profit').textContent = `${estimatedProfit.toFixed(2)}$`;
}

function renderOrdersChart() {
    const ctx = document.getElementById('ordersChart').getContext('2d');
    const monthlyOrders = {};
    allOrders.forEach(order => {
        const date = new Date(order.timestamp.split(' ')[0].split('/').reverse().join('-')); // Format DD/MM/YYYY to YYYY-MM-DD
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyOrders[monthYear] = (monthlyOrders[monthYear] || 0) + 1;
    });
    const labels = Object.keys(monthlyOrders).sort();
    const data = labels.map(label => monthlyOrders[label]);
    if (window.ordersChartInstance) {
        window.ordersChartInstance.destroy();
    }
    window.ordersChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre de Commandes',
                data: data,
                backgroundColor: 'rgba(0, 102, 204, 0.7)',
                borderColor: 'rgba(0, 102, 204, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nombre de Commandes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mois'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Évolution Mensuelle des Commandes'
                }
            }
        }
    });
}

function renderOrdersTable() {
    const tableBody = document.getElementById('orders-table-body');
    tableBody.innerHTML = '';
    allOrders.forEach((order, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = order.orderId || `EW-${order.timestamp.slice(-6)}`;
        row.insertCell().textContent = order.customerName;
        row.insertCell().textContent = order.productType;
        row.insertCell().textContent = order.quantity;
        row.insertCell().textContent = `${order.total}$`;
        row.insertCell().textContent = order.deliveryDate || 'N/A';
        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge';
        statusBadge.textContent = order.status || 'En attente';
        statusBadge.setAttribute('data-status', order.status || 'En attente');
        statusCell.appendChild(statusBadge);
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Voir';
        viewBtn.classList.add('btn-small', 'btn-info');
        viewBtn.onclick = () => openOrderModal(index);
        actionsCell.appendChild(viewBtn);
    });
}

function renderContactsTable() {
    const tableBody = document.getElementById('contacts-table-body');
    tableBody.innerHTML = '';
    allContacts.forEach(contact => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = contact.messageId || `MSG-${contact.timestamp.slice(-8)}`;
        row.insertCell().textContent = contact.name;
        row.insertCell().textContent = contact.email;
        row.insertCell().textContent = contact.subject;
        row.insertCell().textContent = contact.message.substring(0, 50) + '...';
        row.insertCell().textContent = contact.timestamp;
        row.insertCell().textContent = contact.status || 'Nouveau';
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Voir';
        viewBtn.classList.add('btn-small', 'btn-info');
        viewBtn.onclick = () => alert(`Détails du message de ${contact.name}:\n${contact.message}`);
        actionsCell.appendChild(viewBtn);
    });
}

function renderStockTable() {
    const tableBody = document.getElementById('stock-table-body');
    tableBody.innerHTML = '';
    allStock.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.product;
        row.insertCell().textContent = item.quantity;
        row.insertCell().textContent = item.location;
        row.insertCell().textContent = item.threshold;
        const statusCell = row.insertCell();
        statusCell.textContent = item.quantity <= item.threshold ? 'Bas' : 'OK';
        statusCell.classList.add(item.quantity <= item.threshold ? 'status-low' : 'status-ok');
        
        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Modifier';
        editBtn.classList.add('btn-small', 'btn-warning');
        editBtn.onclick = () => editStockItem(index);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.classList.add('btn-small', 'btn-danger');
        deleteBtn.onclick = () => deleteStockItem(index);
        actionsCell.appendChild(deleteBtn);
    });
    updateStockSummaryCards();
}

function updateStockSummaryCards() {
    const totalItems = allStock.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = allStock.filter(item => item.quantity <= item.threshold).length;
    const uniqueWarehouses = new Set(allStock.map(item => item.location)).size;

    document.getElementById('total-stock-items').textContent = totalItems;
    document.getElementById('low-stock-items').textContent = lowStockItems;
    document.getElementById('total-warehouses').textContent = uniqueWarehouses;
}

function initStockManagement() {
    const addStockBtn = document.getElementById('add-stock-item-btn');
    const addStockForm = document.getElementById('add-stock-form');
    const saveStockBtn = document.getElementById('save-stock-item-btn');
    const cancelStockBtn = document.getElementById('cancel-stock-item-btn');

    addStockBtn.addEventListener('click', () => {
        addStockForm.style.display = 'block';
        addStockBtn.style.display = 'none';
        document.getElementById('new-stock-product').value = '';
        document.getElementById('new-stock-quantity').value = 0;
        document.getElementById('new-stock-location').value = '';
        document.getElementById('new-stock-threshold').value = 10;
        saveStockBtn.dataset.editIndex = '';
    });
    cancelStockBtn.addEventListener('click', () => {
        addStockForm.style.display = 'none';
        addStockBtn.style.display = 'block';
    });
    saveStockBtn.addEventListener('click', () => {
        const product = document.getElementById('new-stock-product').value.trim();
        const quantity = parseInt(document.getElementById('new-stock-quantity').value);
        const location = document.getElementById('new-stock-location').value.trim();
        const threshold = parseInt(document.getElementById('new-stock-threshold').value);
        const editIndex = saveStockBtn.dataset.editIndex;

        if (!product || isNaN(quantity) || !location || isNaN(threshold)) {
            showNotification('Veuillez remplir tous les champs du stock correctement.', 'error');
            return;
        }

        if (editIndex !== '') {
            allStock[editIndex] = { product, quantity, location, threshold };
            showNotification('Article de stock modifié avec succès!', 'success');
        } else {
            allStock.push({ product, quantity, location, threshold });
            showNotification('Nouvel article ajouté au stock!', 'success');
        }
        
        renderStockTable();
        addStockForm.style.display = 'none';
        addStockBtn.style.display = 'block';
        console.log('Stock mis à jour (localement):', allStock);
    });
}

function editStockItem(index) {
    const item = allStock[index];
    const addStockForm = document.getElementById('add-stock-form');
    const addStockBtn = document.getElementById('add-stock-item-btn');
    const saveStockBtn = document.getElementById('save-stock-item-btn');

    document.getElementById('new-stock-product').value = item.product;
    document.getElementById('new-stock-quantity').value = item.quantity;
    document.getElementById('new-stock-location').value = item.location;
    document.getElementById('new-stock-threshold').value = item.threshold;
    saveStockBtn.dataset.editIndex = index;

    addStockForm.style.display = 'block';
    addStockBtn.style.display = 'none';
}

function deleteStockItem(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article du stock ?')) {
        allStock.splice(index, 1);
        renderStockTable();
        showNotification('Article de stock supprimé.', 'info');
        console.log('Stock mis à jour (localement):', allStock);
    }
}

function renderAccountingTable() {
    const tableBody = document.getElementById('accounting-table-body');
    tableBody.innerHTML = '';
    allAccounting.forEach((entry, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = entry.date;
        row.insertCell().textContent = entry.description;
        row.insertCell().textContent = entry.type === 'revenue' ? 'Revenu' : 'Dépense';
        row.insertCell().textContent = `${entry.amount.toFixed(2)}$`;
        row.insertCell().textContent = entry.category;
        
        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Modifier';
        editBtn.classList.add('btn-small', 'btn-warning');
        editBtn.onclick = () => editAccountingEntry(index);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.classList.add('btn-small', 'btn-danger');
        deleteBtn.onclick = () => deleteAccountingEntry(index);
        actionsCell.appendChild(deleteBtn);
    });
    updateAccountingSummaryCards();
    renderCashFlowChart();
}

function updateAccountingSummaryCards() {
    const totalRevenue = allAccounting.filter(entry => entry.type === 'revenue').reduce((sum, entry) => sum + entry.amount, 0);
    const totalExpenses = allAccounting.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    document.getElementById('total-revenue').textContent = `${totalRevenue.toFixed(2)}$`;
    document.getElementById('total-expenses').textContent = `${totalExpenses.toFixed(2)}$`;
    document.getElementById('net-profit').textContent = `${netProfit.toFixed(2)}$`;
}

function renderCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    const monthlyData = {};

    allAccounting.forEach(entry => {
        const date = new Date(entry.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { revenue: 0, expense: 0 };
        }
        if (entry.type === 'revenue') {
            monthlyData[monthYear].revenue += entry.amount;
        } else {
            monthlyData[monthYear].expense += entry.amount;
        }
    });

    const labels = Object.keys(monthlyData).sort();
    const revenues = labels.map(label => monthlyData[label].revenue);
    const expenses = labels.map(label => monthlyData[label].expense);

    if (window.cashFlowChartInstance) {
        window.cashFlowChartInstance.destroy();
    }

    window.cashFlowChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenus',
                    data: revenues,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Dépenses',
                    data: expenses,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Montant ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mois'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Flux de Trésorerie Mensuel'
                }
            }
        }
    });
}

function initAccountingManagement() {
    const addAccountingBtn = document.getElementById('add-accounting-entry-btn');
    const addAccountingForm = document.getElementById('add-accounting-form');
    const saveAccountingBtn = document.getElementById('save-accounting-entry-btn');
    const cancelAccountingBtn = document.getElementById('cancel-accounting-entry-btn');

    addAccountingBtn.addEventListener('click', () => {
        addAccountingForm.style.display = 'block';
        addAccountingBtn.style.display = 'none';
        document.getElementById('new-accounting-date').valueAsDate = new Date();
        document.getElementById('new-accounting-description').value = '';
        document.getElementById('new-accounting-type').value = 'revenue';
        document.getElementById('new-accounting-amount').value = 0.00;
        document.getElementById('new-accounting-category').value = '';
        saveAccountingBtn.dataset.editIndex = '';
    });

    cancelAccountingBtn.addEventListener('click', () => {
        addAccountingForm.style.display = 'none';
        addAccountingBtn.style.display = 'block';
    });

    saveAccountingBtn.addEventListener('click', () => {
        const date = document.getElementById('new-accounting-date').value;
        const description = document.getElementById('new-accounting-description').value.trim();
        const type = document.getElementById('new-accounting-type').value;
        const amount = parseFloat(document.getElementById('new-accounting-amount').value);
        const category = document.getElementById('new-accounting-category').value.trim();
        const editIndex = saveAccountingBtn.dataset.editIndex;

        if (!date || !description || !type || isNaN(amount) || !category) {
            showNotification('Veuillez remplir tous les champs comptables correctement.', 'error');
            return;
        }

        const newEntry = { date, description, type, amount, category };

        if (editIndex !== '') {
            allAccounting[editIndex] = newEntry;
            showNotification('Entrée comptable modifiée avec succès!', 'success');
        } else {
            allAccounting.push(newEntry);
            showNotification('Nouvelle entrée comptable ajoutée!', 'success');
        }
        
        renderAccountingTable();
        addAccountingForm.style.display = 'none';
        addAccountingBtn.style.display = 'block';
        console.log('Comptabilité mise à jour (localement):', allAccounting);
        showNotification('Comptabilité mise à jour (localement):', allAccounting, 'success');
    });
}

function editAccountingEntry(index) {
    const entry = allAccounting[index];
    const addAccountingForm = document.getElementById('add-accounting-form');
    const addAccountingBtn = document.getElementById('add-accounting-entry-btn');
    const saveAccountingBtn = document.getElementById('save-accounting-entry-btn');

    document.getElementById('new-accounting-date').value = entry.date;
    document.getElementById('new-accounting-description').value = entry.description;
    document.getElementById('new-accounting-type').value = entry.type;
    document.getElementById('new-accounting-amount').value = entry.amount;
    document.getElementById('new-accounting-category').value = entry.category;
    saveAccountingBtn.dataset.editIndex = index;

    addAccountingForm.style.display = 'block';
    addAccountingBtn.style.display = 'none';
}

function deleteAccountingEntry(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée comptable ?')) {
        allAccounting.splice(index, 1);
        renderAccountingTable();
        showNotification('Entrée comptable supprimée.', 'info');
        console.log('Comptabilité mise à jour (localement):', allAccounting);
    }
}

async function fetchExternalApiData() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Données de l\'API externe (exemple):', data);
        showNotification(`Données externes reçues: ${data.title.substring(0, 30)}...`, 'info');
    } catch (error) {
        console.error('Erreur lors de l\'appel de l\'API externe:', error);
        showNotification('Erreur lors de la récupération des données externes.', 'error');
    }
}

function openOrderModal(orderIndex) {
    currentOrderIndex = orderIndex;
    const order = allOrders[orderIndex];
    document.getElementById('modalOrderTitle').textContent = `Commande ${order.orderId || `EW-${order.timestamp.slice(-6)}`}`;
    document.getElementById('modalOrderId').textContent = order.orderId || `EW-${order.timestamp.slice(-6)}`;
    document.getElementById('modalOrderDate').textContent = order.timestamp;
    const statusElement = document.getElementById('modalOrderStatus');
    statusElement.textContent = order.status || 'En attente';
    statusElement.setAttribute('data-status', order.status || 'En attente');
    document.getElementById('modalCustomerName').textContent = order.customerName || '-';
    document.getElementById('modalCustomerPhone').textContent = order.customerPhone || '-';
    document.getElementById('modalCustomerAddress').textContent = order.customerAddress || '-';
    document.getElementById('modalProductType').textContent = order.productType || '-';
    document.getElementById('modalQuantity').textContent = order.quantity || '-';
    document.getElementById('modalTotal').textContent = order.total ? `${order.total}$` : '-';
    document.getElementById('modalDeliveryDate').textContent = order.deliveryDate || 'Non spécifiée';
    document.getElementById('modalInstructions').textContent = order.specialInstructions || 'Aucune instruction particulière';
    document.getElementById('orderDetailsModal').style.display = 'flex';
    document.addEventListener('keydown', handleModalKeydown);
}

function closeOrderModal() {
    document.getElementById('orderDetailsModal').style.display = 'none';
    currentOrderIndex = null;
    document.removeEventListener('keydown', handleModalKeydown);
}

function editOrderStatus() {
    if (currentOrderIndex === null) return;
    
    const order = allOrders[currentOrderIndex];
    document.getElementById('newOrderStatus').value = order.status || 'En attente';
    document.getElementById('statusEditModal').style.display = 'flex';
}

function closeStatusModal() {
    document.getElementById('statusEditModal').style.display = 'none';
}

function saveOrderStatus() {
    if (currentOrderIndex === null) return;
    const newStatus = document.getElementById('newOrderStatus').value;
    allOrders[currentOrderIndex].status = newStatus;
    const statusElement = document.getElementById('modalOrderStatus');
    statusElement.textContent = newStatus;
    statusElement.setAttribute('data-status', newStatus);
    renderOrdersTable();
    closeStatusModal();
    showNotification(`Statut mis à jour: ${newStatus}`, 'success');
    console.log('Statut de commande mis à jour:', allOrders[currentOrderIndex]);
}

function printOrder() {
    if (currentOrderIndex === null) return;
    const order = allOrders[currentOrderIndex];
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Commande ${order.orderId || `EW-${order.timestamp.slice(-6)}`}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 2rem; 
                    color: #333; 
                }
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid #0066cc; 
                    padding-bottom: 1rem; 
                    margin-bottom: 2rem; 
                }
                .company-name { 
                    color: #0066cc; 
                    font-size: 2rem; 
                    font-weight: bold; 
                    margin-bottom: 0.5rem; 
                }
                .section { 
                    margin-bottom: 2rem; 
                    padding: 1rem; 
                    border: 1px solid #ddd; 
                    border-radius: 5px; 
                }
                .section h3 { 
                    color: #0066cc; 
                    margin-top: 0; 
                    border-bottom: 1px solid #eee; 
                    padding-bottom: 0.5rem; 
                }
                .detail { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 0.5rem; 
                }
                .label { 
                    font-weight: bold; 
                }
                .total { 
                    font-size: 1.2rem; 
                    font-weight: bold; 
                    color: #28a745; 
                }
                .status { 
                    padding: 0.3rem 0.8rem; 
                    border-radius: 15px; 
                    font-weight: bold; 
                    text-transform: uppercase; 
                }
                .status.en-attente { background: #fff3cd; color: #856404; }
                .status.confirme { background: #d1ecf1; color: #0c5460; }
                .status.livre { background: #d4edda; color: #155724; }
                .footer { 
                    margin-top: 3rem; 
                    text-align: center; 
                    font-size: 0.9rem; 
                    color: #666; 
                }
                @media print {
                    body { margin: 1rem; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">EveryWater</div>
                <div>Détails de la Commande</div>
                <div>Date d'impression: ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>
            
            <div class="section">
                <h3>Informations Générales</h3>
                <div class="detail">
                    <span class="label">ID Commande:</span>
                    <span>${order.orderId || `EW-${order.timestamp.slice(-6)}`}</span>
                </div>
                <div class="detail">
                    <span class="label">Date de commande:</span>
                    <span>${order.timestamp}</span>
                </div>
                <div class="detail">
                    <span class="label">Statut:</span>
                    <span class="status ${(order.status || 'En attente').toLowerCase().replace(/\s/g, '-').replace(/é/g, 'e')}">${order.status || 'En attente'}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Informations Client</h3>
                <div class="detail">
                    <span class="label">Nom:</span>
                    <span>${order.customerName || '-'}</span>
                </div>
                <div class="detail">
                    <span class="label">Téléphone:</span>
                    <span>${order.customerPhone || '-'}</span>
                </div>
                <div class="detail">
                    <span class="label">Adresse:</span>
                    <span>${order.customerAddress || '-'}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Détails Produit</h3>
                <div class="detail">
                    <span class="label">Produit:</span>
                    <span>${order.productType || '-'}</span>
                </div>
                <div class="detail">
                    <span class="label">Quantité:</span>
                    <span>${order.quantity || '-'}</span>
                </div>
                <div class="detail total">
                    <span class="label">TOTAL:</span>
                    <span>${order.total ? `${order.total}$` : '-'}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Livraison</h3>
                <div class="detail">
                    <span class="label">Date souhaitée:</span>
                    <span>${order.deliveryDate || 'Non spécifiée'}</span>
                </div>
                <div class="detail">
                    <span class="label">Instructions:</span>
                    <span>${order.specialInstructions || 'Aucune instruction particulière'}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>EveryWater - Service de livraison d'eau de qualité</p>
                <p>Pour toute question, contactez-nous au 555-XXXXXXX</p>
            </div>
        </body>
        </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
    showNotification('Impression en cours...', 'info');
}

function contactCustomer() {
    if (currentOrderIndex === null) return;
    const order = allOrders[currentOrderIndex];
    const customerPhone = order.customerPhone;
    const customerEmail = order.customerEmail || '';
    const contactOptions = [
        customerPhone ? `Appeler ${customerPhone}` : null,
        customerEmail ? `Envoyer un email à ${customerEmail}` : null,
        'Envoyer un SMS',
        'Marquer comme contacté'
    ].filter(Boolean);
    let optionsText = `Comment souhaitez-vous contacter ${order.customerName} ?\n\n`;
    contactOptions.forEach((option, index) => {
        optionsText += `${index + 1}. ${option}\n`;
    });
    const choice = prompt(optionsText + '\nEntrez le numéro de votre choix:');
    if (choice && !isNaN(choice) && choice >= 1 && choice <= contactOptions.length) {
        const selectedOption = contactOptions[parseInt(choice) - 1];
        if (selectedOption.includes('Appeler')) {
            if (customerPhone) {
                window.location.href = `tel:${customerPhone}`;
                showNotification(`Ouverture de l'application téléphone pour appeler ${customerPhone}`, 'info');
            }
        } else if (selectedOption.includes('email')) {
            if (customerEmail) {
                const subject = `Concernant votre commande ${order.orderId || `EW-${order.timestamp.slice(-6)}`}`;
                const body = `Bonjour ${order.customerName},\n\nNous vous contactons concernant votre commande de ${order.productType} (${order.quantity} unité(s)).\n\nCordialement,\nL'équipe EveryWater`;
                window.location.href = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                showNotification(`Ouverture de l'application email...`, 'info');
            }
        } else if (selectedOption.includes('SMS')) {
            if (customerPhone) {
                const message = `Bonjour ${order.customerName}, concernant votre commande EveryWater ${order.orderId || `EW-${order.timestamp.slice(-6)}`}. L'équipe EveryWater`;
                window.location.href = `sms:${customerPhone}?body=${encodeURIComponent(message)}`;
                showNotification(`Ouverture de l'application SMS...`, 'info');
            }
        } else if (selectedOption.includes('contacté')) {
            showNotification(`${order.customerName} marqué comme contacté.`, 'success');
        }
    }
}

function handleModalKeydown(event) {
    if (event.key === 'Escape') {
        if (document.getElementById('statusEditModal').style.display === 'flex') {
            closeStatusModal();
        } else if (document.getElementById('orderDetailsModal').style.display === 'flex') {
            closeOrderModal();
        }
    }
}

document.addEventListener('click', function(event) {
    const orderModal = document.getElementById('orderDetailsModal');
    const statusModal = document.getElementById('statusEditModal');
    
    if (event.target === orderModal) {
        closeOrderModal();
    }
    
    if (event.target === statusModal) {
        closeStatusModal();
    }
});

function renderContactsTable() {
    const tableBody = document.getElementById('contacts-table-body');
    tableBody.innerHTML = '';
    allContacts.forEach((contact, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = contact.messageId || `MSG-${contact.timestamp.slice(-8)}`;
        row.insertCell().textContent = contact.name;
        row.insertCell().textContent = contact.email;
        row.insertCell().textContent = contact.subject;
        row.insertCell().textContent = contact.message.substring(0, 50) + '...';
        row.insertCell().textContent = contact.timestamp;
        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge';
        statusBadge.textContent = contact.status || 'Nouveau';
        statusBadge.setAttribute('data-status', contact.status || 'Nouveau');
        statusCell.appendChild(statusBadge);
        
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Voir';
        viewBtn.classList.add('btn-small', 'btn-info');
        viewBtn.onclick = () => openContactModal(index);
        actionsCell.appendChild(viewBtn);
    });
}

function openContactModal(contactIndex) {
    const contact = allContacts[contactIndex];
    alert(`Message de ${contact.name}:\n\n"${contact.message}"\n\nEmail: ${contact.email}\nReçu le: ${contact.timestamp}`);
}
