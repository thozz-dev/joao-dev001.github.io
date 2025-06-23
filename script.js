const CONFIG = {
    webhooks: {
        orders: 'https://discord.com/api/webhooks/1386797118060236800/knlkM8S2GfEh4v6pV8uCrozo-cQQRPfPxCfYHihIftu2IX_wQpbdb9OKjR6xJ7Ed7kz9',
        contact: 'https://discord.com/api/webhooks/1386799778180104293/pqpA4e07vfx-jJJ2iuoMQ9cV9KflO87KwevJOvNo_KecppDDYXZ8tWWpVz7_FOBTat7k'
    },
    animation: {
        counterDuration: 2000,
        notificationDuration: 5000
    },
    submission: {
        isProcessing: false,
        lastOrderTime: 0,
        debounceDelay: 2000
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollAnimations();
    initCounters();
    initOrderForm();
    initContactForm();
    initSmoothScroll();
    preloadImages();
    console.log('Site EveryWater chargé avec succès!');
});

// Navigation et header
function initNavigation() {
    const navbar = document.querySelector('.header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    // Menu hamburger
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Fermer le menu mobile au clic sur un lien
        document.querySelectorAll('.nav-link, .nav-menu a').forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }

    // Header au scroll
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

    // Vérifier s'il y a déjà un event listener
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
    
    if (productSelect) {
        productSelect.addEventListener('change', updateOrderSummary);
    }
    if (quantityInput) {
        quantityInput.addEventListener('input', updateOrderSummary);
    }
    
    // UN SEUL event listener pour le formulaire
    orderForm.addEventListener('submit', sendOrder, { once: false });
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
        subtotalSpan.textContent = subtotal.toFixed(2) + '$' + (isSubscription ? '/mois' : '');
    }
    if (deliveryFeeSpan) {
        if (isSubscription) {
            deliveryFeeSpan.textContent = 'Inclus';
        } else {
            deliveryFeeSpan.textContent = deliveryFee === 0 ? 'Gratuit' : deliveryFee.toFixed(2) + '$';
        }
    }
    if (totalPriceSpan) {
        totalPriceSpan.textContent = total.toFixed(2) + '$' + (isSubscription ? '/mois' : '');
    }
}

async function sendOrder(event) {
    event.preventDefault();
    
    // PROTECTION ANTI-DUPLICATION
    const currentTime = Date.now();
    
    // Vérifier si une soumission est déjà en cours
    if (CONFIG.submission.isProcessing) {
        console.log('⚠️ Soumission déjà en cours, annulation...');
        showNotification('Une commande est déjà en cours de traitement, veuillez patienter.', 'info');
        return;
    }
    
    // Vérifier le délai entre les soumissions
    if (currentTime - CONFIG.submission.lastOrderTime < CONFIG.submission.debounceDelay) {
        console.log('⚠️ Soumission trop rapide, annulation...');
        showNotification('Veuillez attendre avant de soumettre une nouvelle commande.', 'info');
        return;
    }
    
    // Marquer comme en cours de traitement
    CONFIG.submission.isProcessing = true;
    CONFIG.submission.lastOrderTime = currentTime;
    
    const form = event.target;
    const formData = new FormData(form);

    // Désactiver le bouton de soumission
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
        // Remettre le bouton dans son état normal
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
        
        // Permettre une nouvelle soumission après un délai
        setTimeout(() => {
            CONFIG.submission.isProcessing = false;
        }, 1000); // 1 seconde minimum entre les tentatives
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
    
    let embedColor;
    if (isSubscription) {
        embedColor = 0x6f42c1;
    } else if (total >= 100) {
        embedColor = 0x00ff00;
    } else if (total >= 50) {
        embedColor = 0x4dd0e1;
    } else {
        embedColor = 0xffa500;
    }
    
    const orderNumber = `EW-${Date.now().toString().slice(-6)}`;
    
    const embed = {
        title: isSubscription ? "📋 NOUVEL ABONNEMENT - Every Water" : "🛒 NOUVELLE COMMANDE - Every Water",
        description: `**Numéro:** \`${orderNumber}\`\n${isSubscription ? '🔄 **Abonnement mensuel récurrent**' : total >= 50 ? '🎉 **Commande éligible à la livraison gratuite !**' : '📦 Commande en cours de traitement...'}`,
        color: embedColor,
        fields: [
            {
                name: "👤 INFORMATIONS CLIENT",
                value: `**Nom:** ${orderData.customerName}\n**Téléphone:** ${orderData.customerPhone}`,
                inline: true
            },
            {
                name: "📍 ADRESSE",
                value: `\`\`\`\n${orderData.customerAddress}\n\`\`\``,
                inline: true
            },
            {
                name: isSubscription ? "📋 DÉTAILS ABONNEMENT" : "🛍️ DÉTAILS PRODUIT",
                value: isSubscription ? 
                    `🔄 **${productName}**\n💰 **Prix mensuel:** ${price.toFixed(2)}$\n📅 **Facturation:** Mensuelle` :
                    `🛍️ **${productName}**\n📦 **Quantité:** ${orderData.quantity}\n💰 **Prix unitaire:** ${price.toFixed(2)}$`,
                inline: false
            },
            {
                name: "💳 RÉCAPITULATIF FINANCIER",
                value: isSubscription ?
                    `**Montant mensuel:** ${total.toFixed(2)}$\n**Livraison:** Incluse\n**TOTAL MENSUEL:** **${total.toFixed(2)}$**` :
                    `**Sous-total:** ${subtotal.toFixed(2)}$\n**Livraison:** ${deliveryFee === 0 ? '🆓 Gratuite' : `${deliveryFee.toFixed(2)}$`}\n**TOTAL:** **${total.toFixed(2)}$**`,
                inline: true
            },
            {
                name: "📅 PLANNING",
                value: isSubscription ?
                    `**Début souhaité:** ${orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString('fr-FR') : 'À définir'}\n**Prochaine livraison:** Mensuelle` :
                    orderData.deliveryDate ? 
                        `**Date souhaitée:** ${new Date(orderData.deliveryDate).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}` : 
                        '**Date:** À définir avec le client',
                inline: true
            },
            {
                name: "📝 INSTRUCTIONS SPÉCIALES",
                value: orderData.specialInstructions ? 
                    `\`\`\`\n${orderData.specialInstructions}\n\`\`\`` : 
                    '*Aucune instruction particulière*',
                inline: false
            }
        ],
        author: {
            name: "Every Water - Système de Commandes",
            icon_url: "https://cdn.discordapp.com/attachments/1232583375181582366/1386711049759096833/raw.png?ex=685ab2ce&is=6859614e&hm=1c495883e585e82ba26331cab3699dc8e697706be58b75fad0cdb24688a80a10&"
        },
        thumbnail: {
            url: isSubscription ? 
                "https://cdn-icons-png.flaticon.com/512/2917/2917995.png" :
                "https://cdn-icons-png.flaticon.com/512/3081/3081559.png"
        },
        footer: {
            text: `${isSubscription ? 'Abonnement' : 'Commande'} reçu(e) le ${orderData.timestamp} • Every Water - ID: ${orderNumber}`,
            icon_url: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
        },
        timestamp: new Date().toISOString()
    };

    const messageContent = {
        content: isSubscription ?
            `🔄 **NOUVEL ABONNEMENT EVERY WATER** 🔄\n\n` +
            `💰 **Montant mensuel:** ${total.toFixed(2)}$\n` +
            `📞 **Action requise:** Contacter le client pour finaliser l'abonnement\n` +
            `⏰ **Délai de traitement:** 24h maximum\n\n` +
            `✅ Installation et maintenance incluses` :
            `🚨 **NOUVELLE COMMANDE EVERY WATER** 🚨\n\n` +
            `💰 **Montant:** ${total.toFixed(2)}$ ${total >= 100 ? '🔥 **GROSSE COMMANDE !**' : ''}\n` +
            `📞 **Action requise:** Contacter le client dans les plus brefs délais\n` +
            `⏰ **Délai de traitement:** 24h maximum\n\n` +
            `${total >= 50 ? '✅ Livraison gratuite appliquée' : '⚠️ Frais de livraison: 5$'}`,
        embeds: [embed]
    };

    try {
        if (!CONFIG.webhooks.orders) {
            throw new Error('URL du webhook de commandes non configurée');
        }
        
        console.log(`📤 Envoi de la commande ${orderNumber} vers Discord...`);
        
        const response = await fetch(CONFIG.webhooks.orders, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-OrderSystem/1.0'
            },
            body: JSON.stringify(messageContent)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur Discord:', response.status, errorText);
            if (response.status === 404) {
                throw new Error('Le webhook Discord n\'existe plus ou a été supprimé.');
            } else if (response.status === 401) {
                throw new Error('Token d\'authentification Discord invalide.');
            } else if (response.status === 429) {
                throw new Error('Limite de taux Discord atteinte. Veuillez réessayer plus tard.');
            }
            throw new Error(`Erreur Discord: ${response.status} - ${errorText}`);
        }
        
        console.log(`✅ ${isSubscription ? 'Abonnement' : 'Commande'} ${orderNumber} envoyé(e) avec succès sur Discord`);
        return { success: true, orderNumber };
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi vers Discord:', error);
        throw error;
    }
}

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    
    // Vérifier s'il y a déjà un event listener
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
        timestamp: new Date().toLocaleString('fr-FR')
    };
    
    if (!validateContactForm(contactData)) {
        showNotification('Veuillez corriger les erreurs dans le formulaire.', 'error');
        return;
    }
    
    try {
        await sendContactToDiscord(contactData);
        showNotification('Message envoyé avec succès! Nous vous répondrons dans les plus brefs délais.', 'success');
        form.reset();
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        showNotification('Erreur lors de l\'envoi du message. Veuillez réessayer.', 'error');
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
    if (!contactData || !contactData.subject) {
        throw new Error('Données de contact manquantes');
    }

    const subjectLabels = {
        'information': '📋 Demande d\'information',
        'quote': '💰 Demande de devis',
        'complaint': '⚠️ Réclamation',
        'partnership': '🤝 Partenariat',
        'other': '❓ Autre demande'
    };

    const subjectText = subjectLabels[contactData.subject] || contactData.subject;

    const subjectColors = {
        'information': 0x17a2b8,
        'quote': 0x28a745,
        'complaint': 0xdc3545,
        'partnership': 0x6f42c1,
        'other': 0x6c757d
    };

    const embedColor = subjectColors[contactData.subject] || 0x006bb3;

    const getPriority = (subject) => {
        switch(subject) {
            case 'complaint': return '🔴 **URGENT**';
            case 'partnership': return '🟡 **IMPORTANT**';
            case 'quote': return '🟢 **BUSINESS**';
            default: return '🔵 **NORMAL**';
        }
    };

    const embed = {
        title: "📧 NOUVEAU MESSAGE DE CONTACT",
        description: `**Priorité:** ${getPriority(contactData.subject)}\n**Sujet:** ${subjectText}`,
        color: embedColor,
        fields: [
            {
                name: "👤 INFORMATIONS CLIENT",
                value: `**Nom:** ${contactData.name}\n**Email:** ${contactData.email}`,
                inline: true
            },
            {
                name: "📊 DÉTAILS DE LA DEMANDE",
                value: `**Type:** ${subjectText}\n**Reçu le:** ${contactData.timestamp}`,
                inline: true
            },
            {
                name: "💬 MESSAGE COMPLET",
                value: `\`\`\`\n${contactData.message}\n\`\`\``,
                inline: false
            },
            {
                name: "🎯 ACTIONS A FAIRE",
                value: contactData.subject === 'complaint' ? 
                    '⚡ **Réponse immédiate requise**\n📞 Appeler le client en priorité' :
                    contactData.subject === 'quote' ?
                    '💼 **Préparer un devis personnalisé**\n📧 Répondre sous 24h' :
                    '📧 **Répondre par email**\n📞 Ou contacter par téléphone si nécessaire',
                inline: false
            }
        ],
        author: {
            name: "Every Water - Centre de Contact",
            icon_url: "https://cdn.discordapp.com/attachments/1232583375181582366/1386711049759096833/raw.png?ex=685ab2ce&is=6859614e&hm=1c495883e585e82ba26331cab3699dc8e697706be58b75fad0cdb24688a80a10&"
        },
        thumbnail: {
            url: contactData.subject === 'complaint' ? 
                "https://cdn-icons-png.flaticon.com/512/1828/1828843.png" :
                "https://cdn.discordapp.com/attachments/1232583375181582366/1386711049759096833/raw.png?ex=685ab2ce&is=6859614e&hm=1c495883e585e82ba26331cab3699dc8e697706be58b75fad0cdb24688a80a10&"
        },
        footer: {
            text: `Message ID: ${Date.now().toString().slice(-8)} • Every Water Support`,
            icon_url: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png"
        },
        timestamp: new Date().toISOString()
    };

    const messageContent = {
        content: `📨 **NOUVEAU MESSAGE DE CONTACT** 📨\n\n` +
                `**De:** ${contactData.name} (${contactData.email})\n` +
                `**Sujet:** ${subjectText}\n` +
                `**Priorité:** ${getPriority(contactData.subject)}\n\n` +
                `📞 **Rappel:** Ce client souhaite être recontacté directement par téléphone ou mail.`,
        embeds: [embed]
    };
    
    try {
        if (!CONFIG.webhooks.contact) {
            throw new Error('URL du webhook de contact non configurée');
        }
        
        const response = await fetch(CONFIG.webhooks.contact, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-ContactSystem/1.0'
            },
            body: JSON.stringify(messageContent)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur Discord Contact:', response.status, errorText);
            throw new Error(`Erreur Discord: ${response.status} - ${errorText}`);
        }
        
        console.log(`✅ Message de contact envoyé avec succès sur Discord`);
        return { success: true };

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du contact vers Discord:', error);
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
                border-left: 4px solid #28a745;
                color: #155724;
            }
            .notification-error {
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                color: #721c24;
            }
            .notification-info {
                background: #d1ecf1;
                border-left: 4px solid #17a2b8;
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