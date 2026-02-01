// ==================== UI 管理模块 ====================

const UI = {
    // 初始化
    init() {
        this.updateHealthDisplay();
        this.updateJumpsDisplay();
    },

    // 更新关卡信息
    updateLevelInfo(levelConfig) {
        const ageEl = document.getElementById('ageDisplay');
        const stageEl = document.getElementById('stageDisplay');
        const quoteEl = document.getElementById('quoteDisplay');
        
        if (ageEl) ageEl.textContent = levelConfig.ageRange;
        if (stageEl) stageEl.textContent = levelConfig.stageName;
        if (quoteEl) quoteEl.textContent = levelConfig.quote;
    },

    // 更新血量显示
    updateHealthDisplay() {
        const healthEl = document.getElementById('healthDisplay');
        if (healthEl && typeof Game !== 'undefined') {
            healthEl.textContent = Game.playerHealth || 100;
            const health = Game.playerHealth || 100;
            if (health <= 20) {
                healthEl.style.color = '#e57373';
            } else if (health <= 50) {
                healthEl.style.color = '#ffb74d';
            } else {
                healthEl.style.color = '#81c784';
            }
        }
    },

    // 更新跳跃次数显示
    updateJumpsDisplay() {
        const jumpsEl = document.getElementById('jumpsDisplay');
        if (jumpsEl && typeof Game !== 'undefined') {
            jumpsEl.textContent = Game.jumpCount || 0;
            const jumps = Game.jumpCount || 0;
            const maxJumps = Game.maxJumpsPerLevel || 10;
            if (jumps >= maxJumps) {
                jumpsEl.style.color = '#e57373';
            } else if (jumps >= maxJumps - 1) {
                jumpsEl.style.color = '#ffb74d';
            } else {
                jumpsEl.style.color = '#81c784';
            }
        }
    },

    // 更新排行榜
    updateLeaderboard(leaderboardData) {
        const contentEl = document.getElementById('leaderboard-content');
        if (!contentEl) return;
        
        contentEl.innerHTML = '';
        
        const players = [];
        if (leaderboardData) {
            players.push(...leaderboardData);
        } else {
            // 本地排行榜
            if (typeof Multiplayer !== 'undefined' && Multiplayer.playerId) {
                players.push({
                    playerId: Multiplayer.playerId,
                    name: Multiplayer.playerName,
                    level: Game.currentLevel,
                    time: Game.gameStartTime ? Math.floor((Date.now() - Game.gameStartTime) / 1000) : 0
                });
            }
            
            if (typeof Multiplayer !== 'undefined' && Multiplayer.otherPlayers) {
                Object.values(Multiplayer.otherPlayers).forEach(p => {
                    players.push({
                        playerId: p.humanoid?.userData?.playerId,
                        name: p.name,
                        level: p.level,
                        time: 0
                    });
                });
            }
        }
        
        // 排序：先按关卡，再按时间
        players.sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            return a.time - b.time;
        });
        
        players.forEach((p, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            const isCurrentPlayer = typeof Multiplayer !== 'undefined' && p.playerId === Multiplayer.playerId;
            item.style.borderLeftColor = isCurrentPlayer ? '#4fc3f7' : '#666';
            item.innerHTML = `${index + 1}. ${p.name} - Level ${p.level + 1} ${p.time > 0 ? `(${p.time}s)` : ''}`;
            contentEl.appendChild(item);
        });
    },

    // 显示伤害效果
    showDamageEffect() {
        const damageText = document.createElement('div');
        damageText.textContent = '-10 ❤️';
        damageText.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; color: #e57373; font-weight: bold; text-shadow: 0 0 20px #e57373; z-index: 300; pointer-events: none; animation: fadeOut 1s forwards;';
        
        // 添加动画样式
        if (!document.getElementById('damage-animation-style')) {
            const style = document.createElement('style');
            style.id = 'damage-animation-style';
            style.textContent = '@keyframes fadeOut { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -70%) scale(1.5); } }';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(damageText);
        setTimeout(() => {
            if (document.body.contains(damageText)) {
                document.body.removeChild(damageText);
            }
        }, 1000);
    },

    // 显示拾取效果
    showPackEffect(text, color) {
        const effectText = document.createElement('div');
        effectText.textContent = text;
        const colorHex = '#' + color.toString(16).padStart(6, '0');
        effectText.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 36px; color: ${colorHex}; font-weight: bold; text-shadow: 0 0 20px ${colorHex}; z-index: 300; pointer-events: none; animation: fadeOut 1s forwards;`;
        document.body.appendChild(effectText);
        setTimeout(() => {
            if (document.body.contains(effectText)) {
                document.body.removeChild(effectText);
            }
        }, 1000);
    },

    // 显示跳跃限制提示
    showJumpLimitMessage() {
        const maxJumps = Game.maxJumpsPerLevel || 10;
        const jumpLimitText = document.createElement('div');
        jumpLimitText.textContent = `本关卡最多只能跳${maxJumps}次！你已经用完了所有跳跃次数。`;
        jumpLimitText.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); font-size: 24px; color: #ffb74d; font-weight: bold; text-shadow: 0 0 10px #ffb74d, 0 0 20px #ffb74d; z-index: 300; pointer-events: none; animation: fadeOutTop 1s forwards; background: rgba(0, 0, 0, 0.7); padding: 15px 30px; border-radius: 10px; border: 2px solid #ffb74d;';
        
        // 添加动画样式
        if (!document.getElementById('jump-limit-animation-style')) {
            const style = document.createElement('style');
            style.id = 'jump-limit-animation-style';
            style.textContent = '@keyframes fadeOutTop { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(jumpLimitText);
        setTimeout(() => {
            if (document.body.contains(jumpLimitText)) {
                document.body.removeChild(jumpLimitText);
            }
        }, 1000);
    }
};
