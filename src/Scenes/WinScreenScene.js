class WinScreenScene extends Phaser.Scene {
    constructor() {
        super('WinScreenScene');
    }

    init(data) {
        this.finalScore = data.score || 0;
    }

    preload() {
        this.load.setPath('./assets/');
    }

    create() {
        this.add.text(220, 150, 'You Win!', { fontSize: '32px', fill: '#fff' });
        this.add.text(180, 200, `Score: ${this.finalScore.toLocaleString()} points`, { fontSize: '24px', fill: '#fff' });

        const scores = this.getHighScores();
        const isHighScore = scores.length < 5 || this.finalScore > scores[scores.length - 1].score;

        if (isHighScore) {
            this.add.text(150, 250, "New High Score! Enter your name:", { fontSize: '20px', fill: '#fff' });

            const nameInput = this.add.dom(320, 290, 'input', {
                type: 'text',
                placeholder: 'Your name',
                fontSize: '18px',
                width: '200px',
                padding: '5px'
            });

            const submitBtn = this.add.text(270, 330, "Submit", {
                fontSize: '24px',
                fill: '#0f0',
                backgroundColor: '#222',
                padding: { x: 10, y: 5 }
            }).setInteractive();

            submitBtn.on('pointerdown', () => {
                const name = nameInput.node.value.trim() || "Anonymous";
                this.saveHighScore(name, this.finalScore);
                nameInput.destroy();
                submitBtn.destroy();
                this.showLeaderboard();
            });
        } else {
            this.showLeaderboard();
        }

        const btn = this.add.text(220, 540, 'Play Again?', {
            fontSize: '28px',
            fill: '#0f0',
            backgroundColor: '#333',
            padding: { x: 10, y: 5 }
        }).setInteractive();

        btn.on('pointerdown', () => {
            const shooterScene = this.scene.get('shooterScene');
            shooterScene.currentLevel = 0;
            this.scene.start('shooterScene');
        });
    }

    showLeaderboard() {
        this.add.text(220, 380, "Leaderboard", { fontSize: '22px', fill: '#fff' });
        const scores = this.getHighScores();

        scores.forEach((entry, i) => {
            this.add.text(180, 410 + i * 25, `${i + 1}. ${entry.name} - ${entry.score.toLocaleString()}`, {
                fontSize: '18px',
                fill: '#ccc'
            });
        });
    }

    getHighScores() {
        return JSON.parse(localStorage.getItem("highScores") || "[]");
    }

    saveHighScore(name, score) {
        let scores = this.getHighScores();
        scores.push({ name, score });

        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 5);

        localStorage.setItem("highScores", JSON.stringify(scores));
    }
}
