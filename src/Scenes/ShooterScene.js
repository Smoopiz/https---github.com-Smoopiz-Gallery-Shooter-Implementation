class ShooterScene extends Phaser.Scene {
    constructor() {
        super("shooterScene");
        this.levels = ["LevelOneMap", "LevelTwoMap", "LevelThreeMap"];
        this.currentLevel = 0;

        this.enemyTypes = {
            LowHealthFast: {speed: 1.5, health: 1},
            MediumBoth: {speed: 1.2, health: 2},
            HighHealthSlow: {speed: 1.0, health: 4},
            MiniBossMonster: {speed: 1.2, health: 3},
            BossMonster: {speed: 1, health: 5}
        };

        this.enemyPoints = {
            LowHealthFast: 100,
            MediumBoth: 200,
            HighHealthSlow: 300,
            MiniBossMonster: 400,
            BossMonster: 500
        };

        this.playerStats = [
            {speed: 2, damage: 1.5},
            {speed: 3, damage: 2},
            {speed: 4, damage: 2.5}
        ];

        this.levelData = [
            {LowHealthFast: 10, MediumBoth: 5, HighHealthSlow: 2},
            {LowHealthFast: 20, MediumBoth: 10, HighHealthSlow: 5, MiniBossMonster: 1},
            {LowHealthFast: 30, MediumBoth: 15, HighHealthSlow: 10, MiniBossMonster: 4, BossMonster: 1}
        ];
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("tiles", "scifi_tilesheet.png");

        this.load.tilemapTiledJSON("LevelOneMap", "LevelOneMapFinal.json");
        this.load.tilemapTiledJSON("LevelTwoMap", "LevelTwoMapFinal.json");
        this.load.tilemapTiledJSON("LevelThreeMap", "LevelThreeMapFinal.json");

        this.load.image("player", "player.png");
        this.load.image("bullet", "bullet.png");

        this.load.image("LowHealthFast", "enemy_A.png");
        this.load.image("MediumBoth", "enemy_B.png");
        this.load.image("HighHealthSlow", "enemy_C.png");
        this.load.image("MiniBossMonster", "enemy_D.png");
        this.load.image("BossMonster", "enemy_E.png");
    }

    loadLevel(levelKey) {
        const tilesetKey = "tiles";
        const tilesetNameInTiled = "Base Layer";

        if (this.map) {
            this.baseLayer?.destroy();
            this.middleLayer?.destroy();
            this.topLayer?.destroy();
        }

        this.map = this.make.tilemap({ key: levelKey });
        this.tileset = this.map.addTilesetImage(tilesetNameInTiled, tilesetKey);

        this.baseLayer = this.map.createLayer("Base Layer", this.tileset, 0, 0);
        this.middleLayer = this.map.createLayer("Middle Layer", this.tileset, 0, 0);
        this.topLayer = this.map.createLayer("Top Layer", this.tileset, 0, 0);

        if (this.map.widthInPixels < 640 || this.map.heightInPixels < 640) {
            const scaleX = 640 / this.map.widthInPixels;
            const scaleY = 640 / this.map.heightInPixels;
            const scale = Math.min(scaleX, scaleY);
            this.baseLayer.setScale(scale);
            this.middleLayer.setScale(scale);
            this.topLayer.setScale(scale);
        }
    }

    create() {
        this.currentLevel = 0;

        this.loadLevel(this.levels[this.currentLevel]);

        this.player = this.add.image(320, 560, 'player');

        this.cursors = this.input.keyboard.createCursorKeys();
        this.fire = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.bullets = [];
        this.enemies = [];
        this.lastFired = 0;

        this.playerHealth = 3;
        this.playerHealthText = this.add.text(400, 10, 'Health Remaining: 3', { fontSize: '20px', fill: '#fff' });

        this.score = 0;
        this.playerSCorc = this.add.text(10, 40, 'Score: 0', { fontSize: '20px', fill: '#fff' });

        this.remainingHealth = this.add.text(10, 10, 'Enemies Remaining: 0', { fontSize: '20px', fill: '#fff' });

        const stats = this.playerStats[this.currentLevel];
        this.playerSpeed = stats.speed;
        this.playerDamage = stats.damage;

        this.nextWave();
        this.spawnNextWave();
    }

    nextWave() {
        const config = this.levelData[this.currentLevel];
        this.spawnQueue = [];

        for (let type in config) {
            for (let i = 0; i < config[type]; i++) {
                this.spawnQueue.push(type);
            }
        }

        Phaser.Utils.Array.Shuffle(this.spawnQueue);
        Phaser.Utils.Array.StableSort(this.spawnQueue, (a, b) => (a === "BossMonster" ? 1 : b === "BossMonster" ? -1 : 0));

        this.enemiesRemaining = this.spawnQueue.length;
        this.remainingHealth.setText("Enemies Remaining: " + this.enemiesRemaining);
    }

    spawnNextWave() {
        if (this.spawnQueue.length === 0) return;

        const BATCH_SIZE = Phaser.Math.Between(1, 5);

        for (let i = 0; i < BATCH_SIZE && this.spawnQueue.length > 0; i++) {
            const enemyType = this.spawnQueue.shift();
            this.spawnEnemy(enemyType);
        }

        if (this.spawnQueue.length > 0) {
            this.time.delayedCall(3000, this.spawnNextWave, [], this);
        }
    }

    spawnEnemy(type, overrideStats = null) {
        const x = Phaser.Math.Between(50, 590);
        const enemy = this.add.image(x, 0, type);
        const base = this.enemyTypes[type];

        enemy.type = type;
        enemy.speed = overrideStats?.speed ?? base.speed;
        enemy.maxHealth = overrideStats?.health ?? base.health;
        enemy.health = enemy.maxHealth;
        enemy.isBoss = type === "BossMonster";
        enemy.hasRevived = false;
        enemy.splitFrom = overrideStats?.splitFrom || null;

        this.enemies.push(enemy);

        enemy.healthBarBG = this.add.rectangle(enemy.x, enemy.y - 20, 30, 4, 0xff0000).setDepth(1);
        enemy.healthBar = this.add.rectangle(enemy.x, enemy.y - 20, 30, 4, 0x00ff00).setDepth(2);
    }

    nextLevel() {
        this.currentLevel++;

        if (this.currentLevel >= this.levels.length) {
            this.scene.start('WinScreenScene', { score: this.score });
            return;
        }

        this.playerHealth = 3;
        const stats = this.playerStats[this.currentLevel];
        this.playerSpeed = stats.speed;
        this.playerDamage = stats.damage;

        this.loadLevel(this.levels[this.currentLevel]);
        this.nextStagePrep();
        this.nextWave();
        this.spawnNextWave();
    }

    nextStagePrep() {
        this.enemies.forEach(e => {
            e.destroy();
            e.healthBar?.destroy();
            e.healthBarBG?.destroy();
        });
        this.bullets.forEach(b => b.destroy());
        this.enemies = [];
        this.bullets = [];

        this.player?.destroy();
        this.playerScore?.destroy();
        this.playerHealthText?.destroy();
        this.remainingHealth?.destroy();

        this.player = this.add.image(320, 560, 'player');

        this.playerHealthText = this.add.text(400, 10, 'Health Remaining: ' + this.playerHealth, { fontSize: '20px', fill: '#fff' });
        this.playerSCorc = this.add.text(10, 40, 'Score: ' + this.score, { fontSize: '20px', fill: '#fff' });
        this.remainingHealth = this.add.text(10, 10, 'Enemies Remaining: ' + this.enemiesRemaining, { fontSize: '20px', fill: '#fff' });

        this.lastFired = 0;
    }

    update() {
        if (this.cursors.left.isDown) this.player.x -= this.playerSpeed;
        if (this.cursors.right.isDown) this.player.x += this.playerSpeed;
        if (this.cursors.up.isDown) this.player.y -= this.playerSpeed;
        if (this.cursors.down.isDown) this.player.y += this.playerSpeed;

        this.player.x = Phaser.Math.Clamp(this.player.x, 16, 624);
        this.player.y = Phaser.Math.Clamp(this.player.y, 16, 624);

        if (this.fire.isDown && this.time.now > this.lastFired) {
            let b = this.add.image(this.player.x, this.player.y, 'bullet');
            this.bullets.push(b);
            this.lastFired = this.time.now + 250;
        }

        this.bullets.forEach((bullet, i) => {
            bullet.y -= 4;
            if (bullet.y < 0) {
                bullet.destroy();
                this.bullets.splice(i, 1);
            }
        });

        this.enemies.forEach((enemy, ei) => {
            enemy.y += enemy.speed;
            enemy.healthBarBG.setPosition(enemy.x, enemy.y - 20);
            enemy.healthBar.setPosition(enemy.x, enemy.y - 20);

            if (enemy.y > 640) {
                enemy.destroy();
                this.enemies.splice(ei, 1);
                enemy.healthBar.destroy();
                enemy.healthBarBG.destroy();

                this.enemiesRemaining--;
                this.remainingHealth.setText("Enemies Remaining: " + this.enemiesRemaining);

                this.playerHealth--;
                this.playerHealthText.setText('Health Remaining: ' + this.playerHealth);

                if (this.playerHealth <= 0) {
                    this.scene.start('GameOverScene', { score: this.score });
                }

                if (this.enemiesRemaining <= 0 && this.spawnQueue.length === 0) {
                    this.time.delayedCall(1000, this.nextLevel, [], this);
                }
                return;
            }

            this.bullets.forEach((bullet, bi) => {
                if (Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y) < 10) {
                    bullet.destroy();
                    this.bullets.splice(bi, 1);

                    enemy.health -= this.playerDamage;
                    enemy.health = Math.max(0, enemy.health);
                    let barWidth = (enemy.health / enemy.maxHealth) * 30;
                    enemy.healthBar.width = barWidth;

                    if (enemy.health <= 0) {
                        enemy.healthBar.destroy();
                        enemy.healthBarBG.destroy();

                        this.score += this.enemyPoints[enemy.type] || 0;
                        this.playerSCorc.setText("Score: " + this.score);

                        if (enemy.isBoss && !enemy.hasRevived) {
                            enemy.maxHealth = 10;
                            enemy.health = enemy.maxHealth;
                            enemy.hasRevived = true;
                            enemy.y = -20;

                            enemy.healthBarBG = this.add.rectangle(enemy.x, enemy.y - 30, 100, 6, 0xff0000).setDepth(1);
                            enemy.healthBar = this.add.rectangle(enemy.x, enemy.y - 30, 100, 6, 0x00ff00).setDepth(2);
                            return;
                        }

                        if (enemy.isBoss && enemy.hasRevived || enemy.splitFrom) {
                            const chain = ["BossMonster", "MiniBossMonster", "HighHealthSlow", "MediumBoth", "LowHealthFast"];
                            const from = enemy.splitFrom || enemy.type;
                            const currentIndex = chain.indexOf(from);
                            const nextType = chain[currentIndex + 1];

                            if (nextType) {
                                const baseStats = this.enemyTypes[nextType];
                                const halfSpeed = baseStats.speed * 0.5;
                                const halfHealth = Math.max(1, Math.floor(baseStats.health * 0.5));

                                for (let i = 0; i < 2; i++) {
                                    this.spawnEnemy(nextType, {
                                        speed: halfSpeed,
                                        health: halfHealth,
                                        splitFrom: from
                                    });
                                    this.enemiesRemaining++;
                                    this.remainingHealth.setText("Enemies Remaining: " + this.enemiesRemaining);
                                }
                            }
                        }

                        enemy.destroy();
                        this.enemies.splice(ei, 1);

                        this.enemiesRemaining--;
                        this.remainingHealth.setText("Enemies Remaining: " + this.enemiesRemaining);

                        if (this.enemiesRemaining <= 0 && this.spawnQueue.length === 0) {
                            this.time.delayedCall(1000, this.nextLevel, [], this);
                        }
                    }
                }
            });
        });
    }
}