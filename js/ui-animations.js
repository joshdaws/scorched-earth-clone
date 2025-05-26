// UI Animation Module using GSAP
// Assumes gsap is loaded globally

class UIAnimations {
    constructor() {
        // Register GSAP plugins
        this.registerPlugins();
        
        // Animation timelines
        this.timelines = new Map();
        
        // Default animation settings
        this.defaults = {
            duration: 0.3,
            ease: "power2.out"
        };
    }
    
    registerPlugins() {
        // Register any GSAP plugins if needed
        // gsap.registerPlugin(TextPlugin, etc);
    }
    
    // Menu screen animations
    animateMenuScreen(elements) {
        const tl = gsap.timeline();
        
        // Title animation
        if (elements.title) {
            tl.from(elements.title, {
                y: -100,
                opacity: 0,
                duration: 1,
                ease: "elastic.out(1, 0.5)"
            });
        }
        
        // Menu buttons stagger animation
        if (elements.buttons) {
            tl.from(elements.buttons, {
                x: -200,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: "power3.out"
            }, "-=0.5");
        }
        
        // Version info fade in
        if (elements.version) {
            tl.from(elements.version, {
                opacity: 0,
                duration: 0.5
            }, "-=0.3");
        }
        
        this.timelines.set('menu', tl);
        return tl;
    }
    
    // Shop interface animations
    animateShopOpen(shopElement) {
        const tl = gsap.timeline();
        
        // Scale and fade in
        tl.from(shopElement, {
            scale: 0.8,
            opacity: 0,
            duration: 0.4,
            ease: "back.out(1.7)"
        });
        
        // Animate item rows
        const items = shopElement.querySelectorAll('.shop-item');
        if (items.length > 0) {
            tl.from(items, {
                x: -50,
                opacity: 0,
                duration: 0.3,
                stagger: 0.05,
                ease: "power2.out"
            }, "-=0.2");
        }
        
        return tl;
    }
    
    animateShopClose(shopElement) {
        return gsap.to(shopElement, {
            scale: 0.8,
            opacity: 0,
            duration: 0.3,
            ease: "back.in(1.7)"
        });
    }
    
    // HUD animations
    animateHUDUpdate(element, type = 'pulse') {
        switch(type) {
            case 'pulse':
                return gsap.to(element, {
                    scale: 1.2,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: "power2.inOut"
                });
                
            case 'flash':
                return gsap.to(element, {
                    opacity: 0.3,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 3,
                    ease: "power2.inOut"
                });
                
            case 'shake':
                return gsap.to(element, {
                    x: "+=10",
                    duration: 0.05,
                    yoyo: true,
                    repeat: 5,
                    ease: "power2.inOut",
                    onComplete: () => {
                        gsap.set(element, { x: 0 });
                    }
                });
        }
    }
    
    // Turn indicator animation
    animateTurnIndicator(playerElement) {
        const tl = gsap.timeline();
        
        // Highlight effect
        const highlight = document.createElement('div');
        highlight.className = 'turn-highlight';
        playerElement.appendChild(highlight);
        
        tl.from(highlight, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            ease: "back.out(2)"
        })
        .to(highlight, {
            scale: 1.2,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            onComplete: () => {
                highlight.remove();
            }
        });
        
        // Player name glow
        tl.to(playerElement, {
            textShadow: "0 0 20px #ffff00",
            duration: 0.3,
            ease: "power2.inOut"
        }, 0);
        
        return tl;
    }
    
    // Weapon selection animation
    animateWeaponSelect(weaponElement) {
        const tl = gsap.timeline();
        
        tl.to(weaponElement, {
            scale: 1.1,
            duration: 0.2,
            ease: "back.out(3)"
        })
        .to(weaponElement, {
            scale: 1,
            duration: 0.2,
            ease: "power2.out"
        });
        
        // Add glow effect
        tl.to(weaponElement, {
            boxShadow: "0 0 20px #00ffff",
            duration: 0.3,
            ease: "power2.inOut"
        }, 0);
        
        return tl;
    }
    
    // Score update animation
    animateScoreUpdate(scoreElement, oldScore, newScore) {
        const obj = { score: oldScore };
        
        return gsap.to(obj, {
            score: newScore,
            duration: 1,
            ease: "power2.out",
            onUpdate: () => {
                scoreElement.textContent = Math.round(obj.score);
            }
        });
    }
    
    // Money animation (coins collecting)
    animateMoneyGain(targetElement, amount, sourceX, sourceY) {
        const coins = [];
        const coinCount = Math.min(amount / 100, 10);
        
        for (let i = 0; i < coinCount; i++) {
            const coin = document.createElement('div');
            coin.className = 'money-coin';
            coin.textContent = '$';
            coin.style.position = 'absolute';
            coin.style.left = sourceX + 'px';
            coin.style.top = sourceY + 'px';
            document.body.appendChild(coin);
            coins.push(coin);
        }
        
        const tl = gsap.timeline();
        
        // Spread coins out first
        coins.forEach((coin, i) => {
            const angle = (Math.PI * 2 * i) / coinCount;
            const distance = 50;
            
            tl.to(coin, {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                duration: 0.3,
                ease: "power2.out"
            }, 0);
        });
        
        // Then collect to target
        tl.to(coins, {
            x: targetElement.offsetLeft - sourceX,
            y: targetElement.offsetTop - sourceY,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.in",
            onComplete: function() {
                this.targets().forEach(coin => coin.remove());
            }
        });
        
        // Update money display
        tl.call(() => {
            this.animateHUDUpdate(targetElement, 'pulse');
        });
        
        return tl;
    }
    
    // Victory screen animation
    animateVictoryScreen(victoryElement, playerName) {
        const tl = gsap.timeline();
        
        // Background fade
        tl.from(victoryElement, {
            opacity: 0,
            duration: 0.5
        });
        
        // Victory text
        const title = victoryElement.querySelector('.victory-title');
        if (title) {
            tl.from(title, {
                scale: 0,
                rotation: 720,
                duration: 1,
                ease: "elastic.out(1, 0.5)"
            });
            
            // Continuous glow
            tl.to(title, {
                textShadow: "0 0 30px #ffff00, 0 0 60px #ff00ff",
                duration: 1,
                yoyo: true,
                repeat: -1,
                ease: "power2.inOut"
            });
        }
        
        // Stats fade in
        const stats = victoryElement.querySelectorAll('.stat-item');
        if (stats.length > 0) {
            tl.from(stats, {
                y: 50,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: "power2.out"
            }, "-=0.5");
        }
        
        return tl;
    }
    
    // Damage feedback animation
    animateDamageNumber(x, y, damage, isCritical = false) {
        const damageText = document.createElement('div');
        damageText.className = 'damage-number';
        damageText.textContent = damage;
        damageText.style.position = 'absolute';
        damageText.style.left = x + 'px';
        damageText.style.top = y + 'px';
        
        if (isCritical) {
            damageText.classList.add('critical');
        }
        
        document.body.appendChild(damageText);
        
        const tl = gsap.timeline({
            onComplete: () => damageText.remove()
        });
        
        tl.from(damageText, {
            scale: 0.5,
            duration: 0.2,
            ease: "back.out(3)"
        })
        .to(damageText, {
            y: "-=50",
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        });
        
        if (isCritical) {
            tl.to(damageText, {
                scale: 1.5,
                duration: 0.3,
                ease: "elastic.out(1, 0.5)"
            }, 0);
        }
        
        return tl;
    }
    
    // Loading screen animation
    createLoadingAnimation(loadingElement) {
        const tl = gsap.timeline({ repeat: -1 });
        
        const bars = loadingElement.querySelectorAll('.loading-bar');
        if (bars.length > 0) {
            tl.to(bars, {
                scaleY: 1.5,
                duration: 0.3,
                stagger: 0.1,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut"
            });
        }
        
        return tl;
    }
    
    // Button hover effects
    addButtonHoverEffects(button) {
        button.addEventListener('mouseenter', () => {
            gsap.to(button, {
                scale: 1.05,
                boxShadow: "0 0 20px #00ffff",
                duration: 0.2,
                ease: "power2.out"
            });
        });
        
        button.addEventListener('mouseleave', () => {
            gsap.to(button, {
                scale: 1,
                boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
                duration: 0.2,
                ease: "power2.out"
            });
        });
        
        button.addEventListener('click', () => {
            gsap.to(button, {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut"
            });
        });
    }
    
    // Transition between screens
    transitionScreens(fromScreen, toScreen, type = 'fade') {
        const tl = gsap.timeline();
        
        switch(type) {
            case 'fade':
                tl.to(fromScreen, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => {
                        fromScreen.style.display = 'none';
                    }
                })
                .set(toScreen, { display: 'block', opacity: 0 })
                .to(toScreen, {
                    opacity: 1,
                    duration: 0.3
                });
                break;
                
            case 'slide':
                tl.to(fromScreen, {
                    x: -window.innerWidth,
                    duration: 0.5,
                    ease: "power2.in",
                    onComplete: () => {
                        fromScreen.style.display = 'none';
                    }
                })
                .set(toScreen, { display: 'block', x: window.innerWidth })
                .to(toScreen, {
                    x: 0,
                    duration: 0.5,
                    ease: "power2.out"
                }, "-=0.2");
                break;
                
            case 'zoom':
                tl.to(fromScreen, {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.4,
                    ease: "power2.in",
                    onComplete: () => {
                        fromScreen.style.display = 'none';
                    }
                })
                .set(toScreen, { display: 'block', scale: 1.2, opacity: 0 })
                .to(toScreen, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.4,
                    ease: "power2.out"
                });
                break;
        }
        
        return tl;
    }
    
    // Clean up animations
    killTimeline(name) {
        const tl = this.timelines.get(name);
        if (tl) {
            tl.kill();
            this.timelines.delete(name);
        }
    }
    
    killAll() {
        this.timelines.forEach(tl => tl.kill());
        this.timelines.clear();
        gsap.killTweensOf("*");
    }
}

// Export as global
if (typeof window !== 'undefined') {
    window.UIAnimations = UIAnimations;
}