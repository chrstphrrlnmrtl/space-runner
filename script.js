
/* ============================================
   CUSTOMIZATION AND ADJUSTMENT — JAVASCRIPT
   Modify the values below to customize
   images, positions, sizes, and gameplay.
   ============================================ */

const CONFIG = {

    // ========================================
    // A. IMAGE ASSETS
    // Replace these paths with your PNG files.
    // Leave the paths unchanged to use fallbacks.
    // ========================================

    assets: {
        runner: "assets/runner.png",
        obstacle1: "assets/obstacle1.png",
        obstacle2: "assets/obstacle2.png",
        background: "assets/background.png",
        doodad1: "assets/doodad1.png",
        doodad2: "assets/doodad2.png"
    },


    // ========================================
    // B. RUNNER
    // ========================================

    runner: {
        x: 125,                 // Horizontal position
        yOffset: 0,             // Vertical ground adjustment
        maxWidth: 130,           // Maximum image width
        maxHeight: 100,          // Maximum image height
        imageOffsetX: 0,         // Horizontal image adjustment
        imageOffsetY: 40,         // Vertical image adjustment
        jumpStrength: -670,      // Jump power
        gravity: 1670,           // Downward acceleration
        hitboxPaddingX: 12,      // Horizontal collision reduction
        hitboxPaddingY: 25       // Vertical collision reduction
    },


    // ========================================
    // C. OBSTACLE 1 — ENEMY SPACESHIP
    // ========================================

    obstacle1: {
        maxWidth: 150,
        maxHeight: 100,
        imageOffsetX: 0,
        imageOffsetY: 40,
        groundOffset: 0,
        hitboxPaddingX: 25,
        hitboxPaddingY: 23
    },


    // ========================================
    // D. OBSTACLE 2 — COSMIC DEBRIS
    // ========================================

    obstacle2: {
        maxWidth: 130,
        maxHeight: 145,
        imageOffsetX: 0,
        imageOffsetY: 40,
        groundOffset: 0,
        hitboxPaddingX: 30,
        hitboxPaddingY: 25
    },


    // ========================================
    // E. BACKGROUND
    // ========================================

    background: {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        scrollSpeed: 0.12,
        fallbackColor: "#080b25",
        alignment: "center"
    },


    // ========================================
    // F. DOODAD 1 — DIFFERENT PLANETS
    // ========================================

    doodad1: {
        x: 300,
        y: 55,
        maxWidth: 90,
        maxHeight: 90,
        imageOffsetX: 0,
        imageOffsetY: 0,
        repeat: true,
        spacing: 520,
        scrollSpeed: 0.16
    },


    // ========================================
    // G. DOODAD 2 — SHOOTING STARS
    // ========================================

    doodad2: {
        x: 180,
        y: 125,
        maxWidth: 65,
        maxHeight: 32,
        imageOffsetX: 0,
        imageOffsetY: 0,
        repeat: true,
        spacing: 260,
        scrollSpeed: 0.48
    },


    // ========================================
    // H. GAMEPLAY
    // ========================================

    gameplay: {
        startingSpeed: 330,
        maxSpeed: 750,
        difficultyIncrease: 12,
        minObstacleSpacing: 290,
        maxObstacleSpacing: 470
    },


    // ========================================
    // I. DEBUG — HITBOX VISUALIZATION
    // ========================================

    debug: {
        showHitboxes: false,
        runnerHitboxColor: "#00FF00",
        obstacleHitboxColor: "#FF0000",
        hitboxLineWidth: 2
    }

};


/* ============================================
   END OF CUSTOMIZATION AND ADJUSTMENT
   GAME LOGIC BELOW
   ============================================ */


/* ============================================
   1. HTML ELEMENTS
   ============================================ */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");

const gameOverlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");

const startButton = document.getElementById("startButton");
const assetStatus = document.getElementById("assetStatus");

// Read button labels directly from HTML.
const startText = startButton.dataset.startText || "Start Game";
const restartText = startButton.dataset.restartText || "Restart Game";

// Preserve the logical Canvas resolution.
const WIDTH = 960;
const HEIGHT = 450;

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Ground position.
const GROUND_Y = 380;


/* ============================================
   2. GAME STATE
   ============================================ */

let gameState = "ready";

let score = 0;
let highScore = loadHighScore();

let gameSpeed = CONFIG.gameplay.startingSpeed;
let elapsedTime = 0;

let obstacles = [];

let obstacleTimer = 0;
let nextObstacleSpacing = 380;

let animationFrameId = null;
let previousTime = 0;

let backgroundScroll = 0;

let doodad1Items = [];
let doodad2Items = [];

const runner = {
    x: CONFIG.runner.x,
    y: GROUND_Y + CONFIG.runner.yOffset,
    velocityY: 0,
    width: CONFIG.runner.maxWidth,
    height: CONFIG.runner.maxHeight,
    onGround: true,
    animationTime: 0
};


/* ============================================
   3. IMAGE LOADING
   ============================================ */

const images = {};

const assetNames = [
    "runner",
    "obstacle1",
    "obstacle2",
    "background",
    "doodad1",
    "doodad2"
];

const imageReady = {};

function loadImages() {

    let loadedCount = 0;
    let fallbackCount = 0;

    assetNames.forEach(name => {

        const image = new Image();

        imageReady[name] = false;

        image.onload = () => {

            imageReady[name] = true;

            loadedCount++;

            updateAssetStatus();

        };

        image.onerror = () => {

            imageReady[name] = false;

            fallbackCount++;

            updateAssetStatus();

        };

        images[name] = image;

        image.src = CONFIG.assets[name];

    });

    function updateAssetStatus() {

        const finished = assetNames.every(name =>
            imageReady[name] ||
            images[name].complete && images[name].naturalWidth === 0
        );

        if (!finished) {
            assetStatus.textContent =
                `Loading game assets... ${loadedCount + fallbackCount}/6`;
            return;
        }

        assetStatus.textContent =
            fallbackCount > 0
                ? `Ready! ${fallbackCount} asset(s) using Canvas fallback graphics.`
                : "All game assets loaded successfully!";

    }

}


/* ============================================
   4. IMAGE DIMENSION CALCULATIONS
   ============================================ */

// Fit an image inside maximum dimensions
// without changing its original proportions.

function getImageDimensions(image, maxWidth, maxHeight) {

    if (!image || !image.naturalWidth || !image.naturalHeight) {

        return {
            width: maxWidth,
            height: maxHeight
        };

    }

    const ratio = Math.min(
        maxWidth / image.naturalWidth,
        maxHeight / image.naturalHeight
    );

    return {
        width: image.naturalWidth * ratio,
        height: image.naturalHeight * ratio
    };

}


// Get the displayed dimensions of any asset.

function getAssetDimensions(name) {

    const settings = CONFIG[name];

    const image = images[name];

    return getImageDimensions(
        imageReady[name] ? image : null,
        settings.maxWidth || CONFIG.runner.maxWidth,
        settings.maxHeight || CONFIG.runner.maxHeight
    );

}


/* ============================================
   5. BACKGROUND RENDERING
   ============================================ */

function drawBackground() {

    const settings = CONFIG.background;

    ctx.fillStyle = settings.fallbackColor;

    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const image = images.background;

    if (imageReady.background) {

        const scale = Math.max(
            WIDTH / image.naturalWidth,
            HEIGHT / image.naturalHeight
        ) * settings.scale;

        const imageWidth = image.naturalWidth * scale;
        const imageHeight = image.naturalHeight * scale;

        let y = 0;

        if (settings.alignment === "top") {
            y = 0;
        } else if (settings.alignment === "bottom") {
            y = HEIGHT - imageHeight;
        } else {
            y = (HEIGHT - imageHeight) / 2;
        }

        y += settings.offsetY;

        const tileWidth = imageWidth;

        const scroll = backgroundScroll % tileWidth;

        const startX = -scroll + settings.offsetX;

        ctx.save();

        ctx.beginPath();
        ctx.rect(0, 0, WIDTH, HEIGHT);
        ctx.clip();

        // Draw enough tiles to cover the entire Canvas.
        for (
            let x = startX - tileWidth;
            x < WIDTH + tileWidth;
            x += tileWidth
        ) {

            ctx.drawImage(
                image,
                x,
                y,
                imageWidth,
                imageHeight
            );

        }

        ctx.restore();

        return;

    }

    // Fallback Milky Way background.

    drawGalaxyFallback();

}


function drawGalaxyFallback() {

    // Nebula regions.

    ctx.fillStyle = "#11113c";
    ctx.beginPath();
    ctx.ellipse(240, 120, 220, 95, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#251044";
    ctx.beginPath();
    ctx.ellipse(690, 180, 260, 110, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#10284b";
    ctx.beginPath();
    ctx.ellipse(460, 80, 160, 65, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Fixed star field with deterministic positions.

    for (let i = 0; i < 100; i++) {

        const x = (i * 137.5 + 31) % WIDTH;
        const y = (i * 83.7 + 17) % 340;

        const radius = i % 4 === 0 ? 2 : 1;

        ctx.fillStyle = i % 3 === 0
            ? "#a5f3fc"
            : "#ffffff";

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

    }

    // Distant galaxy line.

    ctx.fillStyle = "rgba(139, 92, 246, 0.12)";
    ctx.fillRect(0, 330, WIDTH, 18);

    // Ground.

    ctx.fillStyle = "#111a3b";
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(0, GROUND_Y, WIDTH, 3);

}


/* ============================================
   6. DOODAD INITIALIZATION
   ============================================ */

function initializeDoodads() {

    doodad1Items = createDoodadItems("doodad1");
    doodad2Items = createDoodadItems("doodad2");

}


function createDoodadItems(name) {

    const settings = CONFIG[name];

    if (!settings.repeat) {

        return [{
            x: settings.x,
            y: settings.y
        }];

    }

    const items = [];

    const spacing = Math.max(
        1,
        settings.maxWidth + settings.spacing
    );

    const count = Math.ceil(WIDTH / spacing) + 3;

    for (let i = 0; i < count; i++) {

        items.push({
            x: settings.x + i * spacing,
            y: settings.y
        });

    }

    return items;

}


/* ============================================
   7. DOODAD MOVEMENT
   ============================================ */

function updateDoodads(dt) {

    updateSingleDoodad("doodad1", doodad1Items, dt);
    updateSingleDoodad("doodad2", doodad2Items, dt);

}


function updateSingleDoodad(name, items, dt) {

    const settings = CONFIG[name];

    const movement = gameSpeed *
        settings.scrollSpeed *
        dt;

    items.forEach(item => {

        item.x -= movement;

    });

    if (!settings.repeat || items.length === 0) {
        return;
    }

    const spacing = Math.max(
        1,
        settings.maxWidth + settings.spacing
    );

    const rightmost = Math.max(
        ...items.map(item => item.x)
    );

    items.forEach(item => {

        if (item.x + settings.maxWidth < 0) {

            item.x = rightmost + spacing;

        }

    });

}


function drawDoodads() {

    drawDoodad("doodad1", doodad1Items);
    drawDoodad("doodad2", doodad2Items);

}


function drawDoodad(name, items) {

    const settings = CONFIG[name];

    items.forEach(item => {

        const x = item.x + settings.imageOffsetX;
        const y = item.y + settings.imageOffsetY;

        const width = settings.maxWidth;
        const height = settings.maxHeight;

        if (imageReady[name]) {

            const dimensions = getAssetDimensions(name);

            const imageX = x;
            const imageY = y;

            ctx.drawImage(
                images[name],
                imageX,
                imageY,
                dimensions.width,
                dimensions.height
            );

        } else {

            if (name === "doodad1") {
                drawPlanetFallback(x, y, width, height, item);
            }

            if (name === "doodad2") {
                drawShootingStarFallback(x, y, width, height);
            }

        }

    });

}


/* ============================================
   8. DOODAD FALLBACK GRAPHICS
   ============================================ */

// Doodad 1: Different planets.

function drawPlanetFallback(x, y, width, height, item) {

    const colors = [
        "#a855f7",
        "#38bdf8",
        "#f97316",
        "#e879f9",
        "#22c55e"
    ];

    const index = Math.abs(
        Math.floor((item.x + 1000) / 520)
    ) % colors.length;

    const color = colors[index];

    const radius = Math.min(width, height) * 0.35;

    ctx.save();

    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(
        x + width / 2,
        y + height / 2,
        radius,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Planet shading.

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";

    ctx.beginPath();
    ctx.arc(
        x + width / 2 + radius * 0.3,
        y + height / 2,
        radius * 0.8,
        -Math.PI / 2,
        Math.PI / 2
    );
    ctx.fill();

    // Planet ring.

    if (index % 2 === 0) {

        ctx.strokeStyle = "#c4b5fd";
        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.ellipse(
            x + width / 2,
            y + height / 2,
            radius * 1.5,
            radius * 0.4,
            -0.2,
            0,
            Math.PI * 2
        );

        ctx.stroke();

    }

    // Small crater.

    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";

    ctx.beginPath();
    ctx.arc(
        x + width / 2 - radius * 0.3,
        y + height / 2 - radius * 0.2,
        radius * 0.13,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

}


// Doodad 2: Shooting stars.

function drawShootingStarFallback(x, y, width, height) {

    ctx.save();

    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.7);
    ctx.lineTo(x + width * 0.65, y + height * 0.3);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
        x + width * 0.72,
        y + height * 0.25,
        4,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

}


/* ============================================
   9. GENERIC ASSET RENDERING
   ============================================ */

// Runner and obstacles use bottom-center anchors.

function drawAnchoredAsset(
    name,
    x,
    bottomY,
    maxWidth,
    maxHeight,
    offsetX,
    offsetY,
    fallbackFunction,
    animationTime = 0
) {

    const dimensions = getImageDimensions(
        imageReady[name] ? images[name] : null,
        maxWidth,
        maxHeight
    );

    const width = dimensions.width;
    const height = dimensions.height;

    const drawX = x - width / 2 + offsetX;
    const drawY = bottomY - height + offsetY;

    if (imageReady[name]) {

        ctx.drawImage(
            images[name],
            drawX,
            drawY,
            width,
            height
        );

    } else {

        fallbackFunction(
            drawX,
            drawY,
            width,
            height,
            animationTime
        );

    }

    return {
        x: drawX,
        y: drawY,
        width,
        height
    };

}


/* ============================================
   10. RUNNER FALLBACK GRAPHIC
   ============================================ */

// Recognizable side-view spaceship.

function drawRunnerFallback(x, y, width, height, time) {

    const bob = Math.sin(time * 8) * 2;

    ctx.save();

    ctx.translate(0, bob);

    // Rear engine flame.

    ctx.fillStyle = "#f97316";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.08, y + height * 0.48);
    ctx.lineTo(x - width * 0.12, y + height * 0.35);
    ctx.lineTo(x - width * 0.08, y + height * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fde047";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.08, y + height * 0.49);
    ctx.lineTo(x - width * 0.04, y + height * 0.43);
    ctx.lineTo(x - width * 0.03, y + height * 0.57);
    ctx.closePath();
    ctx.fill();

    // Main spaceship body.

    ctx.fillStyle = "#cbd5e1";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.05, y + height * 0.52);
    ctx.lineTo(x + width * 0.55, y + height * 0.25);
    ctx.lineTo(x + width * 0.97, y + height * 0.48);
    ctx.lineTo(x + width * 0.55, y + height * 0.73);
    ctx.closePath();
    ctx.fill();

    // Lower body panel.

    ctx.fillStyle = "#64748b";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.53);
    ctx.lineTo(x + width * 0.55, y + height * 0.73);
    ctx.lineTo(x + width * 0.85, y + height * 0.53);
    ctx.closePath();
    ctx.fill();

    // Upper wing.

    ctx.fillStyle = "#8b5cf6";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.37);
    ctx.lineTo(x + width * 0.45, y + height * 0.05);
    ctx.lineTo(x + width * 0.69, y + height * 0.32);
    ctx.closePath();
    ctx.fill();

    // Lower wing.

    ctx.fillStyle = "#7c3aed";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.63);
    ctx.lineTo(x + width * 0.45, y + height * 0.94);
    ctx.lineTo(x + width * 0.69, y + height * 0.68);
    ctx.closePath();
    ctx.fill();

    // Cockpit.

    ctx.fillStyle = "#22d3ee";

    ctx.beginPath();
    ctx.ellipse(
        x + width * 0.66,
        y + height * 0.43,
        width * 0.13,
        height * 0.11,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Cockpit highlight.

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
        x + width * 0.69,
        y + height * 0.40,
        2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

}


/* ============================================
   11. OBSTACLE 1 FALLBACK GRAPHIC
   ============================================ */

// Enemy spaceship.

function drawObstacle1Fallback(x, y, width, height) {

    ctx.save();

    // Rear fins.

    ctx.fillStyle = "#be123c";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.25, y + height * 0.25);
    ctx.lineTo(x + width * 0.08, y + height * 0.02);
    ctx.lineTo(x + width * 0.43, y + height * 0.27);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + width * 0.25, y + height * 0.75);
    ctx.lineTo(x + width * 0.08, y + height * 0.98);
    ctx.lineTo(x + width * 0.43, y + height * 0.73);
    ctx.closePath();
    ctx.fill();

    // Main body.

    ctx.fillStyle = "#dc2626";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.05, y + height * 0.5);
    ctx.lineTo(x + width * 0.42, y + height * 0.18);
    ctx.lineTo(x + width * 0.96, y + height * 0.5);
    ctx.lineTo(x + width * 0.42, y + height * 0.82);
    ctx.closePath();
    ctx.fill();

    // Front nose.

    ctx.fillStyle = "#fca5a5";

    ctx.beginPath();
    ctx.arc(
        x + width * 0.75,
        y + height * 0.5,
        height * 0.1,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Cockpit.

    ctx.fillStyle = "#38bdf8";

    ctx.beginPath();
    ctx.ellipse(
        x + width * 0.53,
        y + height * 0.43,
        width * 0.14,
        height * 0.12,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Warning light.

    ctx.fillStyle = "#fef08a";

    ctx.beginPath();
    ctx.arc(
        x + width * 0.38,
        y + height * 0.5,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

}


/* ============================================
   12. OBSTACLE 2 FALLBACK GRAPHIC
   ============================================ */

// Irregular cosmic debris.

function drawObstacle2Fallback(x, y, width, height) {

    ctx.save();

    ctx.fillStyle = "#78716c";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.42, y + height * 0.02);
    ctx.lineTo(x + width * 0.76, y + height * 0.13);
    ctx.lineTo(x + width * 0.98, y + height * 0.43);
    ctx.lineTo(x + width * 0.83, y + height * 0.83);
    ctx.lineTo(x + width * 0.48, y + height * 0.98);
    ctx.lineTo(x + width * 0.08, y + height * 0.78);
    ctx.lineTo(x + width * 0.02, y + height * 0.38);
    ctx.lineTo(x + width * 0.23, y + height * 0.12);
    ctx.closePath();
    ctx.fill();

    // Rocky surfaces.

    ctx.fillStyle = "#a8a29e";

    ctx.beginPath();
    ctx.moveTo(x + width * 0.42, y + height * 0.13);
    ctx.lineTo(x + width * 0.73, y + height * 0.25);
    ctx.lineTo(x + width * 0.54, y + height * 0.5);
    ctx.lineTo(x + width * 0.2, y + height * 0.35);
    ctx.closePath();
    ctx.fill();

    // Craters.

    ctx.fillStyle = "#57534e";

    ctx.beginPath();
    ctx.arc(
        x + width * 0.7,
        y + height * 0.65,
        width * 0.09,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
        x + width * 0.31,
        y + height * 0.69,
        width * 0.07,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

}


/* ============================================
   13. RUNNER RENDERING AND POSITIONING
   ============================================ */

function getRunnerBottomY() {

    return runner.y - runner.velocityY * 0;

}


function getRunnerRectangle() {

    const dimensions = getImageDimensions(
        imageReady.runner ? images.runner : null,
        CONFIG.runner.maxWidth,
        CONFIG.runner.maxHeight
    );

    const x = runner.x - dimensions.width / 2 +
        CONFIG.runner.imageOffsetX;

    const y = getRunnerBottomY() - dimensions.height +
        CONFIG.runner.imageOffsetY;

    return {
        x: x + CONFIG.runner.hitboxPaddingX,
        y: y + CONFIG.runner.hitboxPaddingY,
        width: Math.max(
            0,
            dimensions.width - CONFIG.runner.hitboxPaddingX * 2
        ),
        height: Math.max(
            0,
            dimensions.height - CONFIG.runner.hitboxPaddingY * 2
        )
    };

}


function drawRunner() {

    runner.width = getAssetDimensions("runner").width;
    runner.height = getAssetDimensions("runner").height;

    drawAnchoredAsset(
        "runner",
        runner.x,
        runner.y,
        CONFIG.runner.maxWidth,
        CONFIG.runner.maxHeight,
        CONFIG.runner.imageOffsetX,
        CONFIG.runner.imageOffsetY,
        drawRunnerFallback,
        runner.animationTime
    );

}


/* ============================================
   14. OBSTACLE CREATION
   ============================================ */

function createObstacle() {

    const name = Math.random() < 0.5
        ? "obstacle1"
        : "obstacle2";

    const settings = CONFIG[name];

    const dimensions = getAssetDimensions(name);

    obstacles.push({

        name,

        x: WIDTH + dimensions.width,

        y: GROUND_Y - settings.groundOffset,

        width: dimensions.width,
        height: dimensions.height

    });

}


function getObstacleRectangle(obstacle) {

    const settings = CONFIG[obstacle.name];

    const dimensions = getImageDimensions(
        imageReady[obstacle.name]
            ? images[obstacle.name]
            : null,
        settings.maxWidth,
        settings.maxHeight
    );

    const x = obstacle.x - dimensions.width / 2 +
        settings.imageOffsetX;

    const y = obstacle.y - dimensions.height +
        settings.imageOffsetY;

    return {

        x: x + settings.hitboxPaddingX,

        y: y + settings.hitboxPaddingY,

        width: Math.max(
            0,
            dimensions.width - settings.hitboxPaddingX * 2
        ),

        height: Math.max(
            0,
            dimensions.height - settings.hitboxPaddingY * 2
        )

    };

}


/* ============================================
   15. OBSTACLE RENDERING
   ============================================ */

function drawObstacles() {

    obstacles.forEach(obstacle => {

        const settings = CONFIG[obstacle.name];

        const fallback = obstacle.name === "obstacle1"
            ? drawObstacle1Fallback
            : drawObstacle2Fallback;

        drawAnchoredAsset(
            obstacle.name,
            obstacle.x,
            obstacle.y,
            settings.maxWidth,
            settings.maxHeight,
            settings.imageOffsetX,
            settings.imageOffsetY,
            fallback
        );

    });

}


/* ============================================
   16. COLLISION DETECTION
   ============================================ */

function checkCollision(rect1, rect2) {

    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );

}


function checkObstacleCollisions() {

    const runnerRect = getRunnerRectangle();

    for (const obstacle of obstacles) {

        const obstacleRect = getObstacleRectangle(obstacle);

        if (checkCollision(runnerRect, obstacleRect)) {

            endGame();

            return;

        }

    }

}


/* ============================================
   17. HITBOX DEBUG VISUALIZATION
   ============================================ */

function drawHitboxes() {

    if (!CONFIG.debug.showHitboxes) {
        return;
    }

    ctx.save();

    ctx.lineWidth = CONFIG.debug.hitboxLineWidth;

    // Actual runner collision hitbox.

    const runnerRect = getRunnerRectangle();

    ctx.strokeStyle = CONFIG.debug.runnerHitboxColor;

    ctx.strokeRect(
        runnerRect.x,
        runnerRect.y,
        runnerRect.width,
        runnerRect.height
    );

    // Actual obstacle collision hitboxes.

    ctx.strokeStyle = CONFIG.debug.obstacleHitboxColor;

    obstacles.forEach(obstacle => {

        const rect = getObstacleRectangle(obstacle);

        ctx.strokeRect(
            rect.x,
            rect.y,
            rect.width,
            rect.height
        );

    });

    ctx.restore();

}


/* ============================================
   18. JUMPING MECHANICS
   ============================================ */

function jump() {

    if (gameState === "ready") {

        startGame();

        return;

    }

    if (gameState !== "playing") {
        return;
    }

    // Prevent double jumping.

    if (!runner.onGround) {
        return;
    }

    runner.velocityY = CONFIG.runner.jumpStrength;

    runner.onGround = false;

}


function updateRunner(dt) {

    runner.animationTime += dt;

    if (runner.onGround) {
        return;
    }

    runner.velocityY += CONFIG.runner.gravity * dt;

    runner.y += runner.velocityY * dt;

    // Stop the runner at ground level.

    const groundPosition = GROUND_Y + CONFIG.runner.yOffset;

    if (runner.y >= groundPosition) {

        runner.y = groundPosition;

        runner.velocityY = 0;

        runner.onGround = true;

    }

}


/* ============================================
   19. OBSTACLE MOVEMENT
   ============================================ */

function updateObstacles(dt) {

    obstacles.forEach(obstacle => {

        obstacle.x -= gameSpeed * dt;

    });

    // Remove obstacles that leave the screen.

    obstacles = obstacles.filter(obstacle => {

        const dimensions = getAssetDimensions(obstacle.name);

        return obstacle.x + dimensions.width / 2 > 0;

    });

    obstacleTimer += gameSpeed * dt;

    if (obstacleTimer >= nextObstacleSpacing) {

        createObstacle();

        obstacleTimer = 0;

        nextObstacleSpacing =
            CONFIG.gameplay.minObstacleSpacing +
            Math.random() * (
                CONFIG.gameplay.maxObstacleSpacing -
                CONFIG.gameplay.minObstacleSpacing
            );

    }

}


/* ============================================
   20. SCORING
   ============================================ */

function updateScore(dt) {

    score += dt * 10;

    gameSpeed = Math.min(
        CONFIG.gameplay.startingSpeed +
        elapsedTime * CONFIG.gameplay.difficultyIncrease,
        CONFIG.gameplay.maxSpeed
    );

    scoreDisplay.textContent = Math.floor(score);

}


function loadHighScore() {

    try {

        const savedScore = localStorage.getItem("spaceRunnerHighScore");

        return savedScore ? Math.max(0, Number(savedScore) || 0) : 0;

    } catch (error) {

        return 0;

    }

}


function saveHighScore() {

    if (score > highScore) {

        highScore = Math.floor(score);

        try {

            localStorage.setItem(
                "spaceRunnerHighScore",
                String(highScore)
            );

        } catch (error) {

            // Game continues even if storage is unavailable.

        }

    }

    highScoreDisplay.textContent = Math.floor(highScore);

}


/* ============================================
   21. GAME START
   ============================================ */

function startGame() {

    if (gameState === "playing") {
        return;
    }

    gameState = "playing";

    score = 0;

    elapsedTime = 0;

    gameSpeed = CONFIG.gameplay.startingSpeed;

    obstacles = [];

    obstacleTimer = 0;

    nextObstacleSpacing =
        CONFIG.gameplay.minObstacleSpacing +
        Math.random() * (
            CONFIG.gameplay.maxObstacleSpacing -
            CONFIG.gameplay.minObstacleSpacing
        );

    backgroundScroll = 0;

    runner.x = CONFIG.runner.x;

    runner.y = GROUND_Y + CONFIG.runner.yOffset;

    runner.velocityY = 0;

    runner.onGround = true;

    runner.animationTime = 0;

    // Reset decorative elements.

    initializeDoodads();

    // Hide the start/game over overlay.

    gameOverlay.style.display = "none";

    startButton.textContent = restartText;

    scoreDisplay.textContent = "0";

}


/* ============================================
   22. GAME OVER
   ============================================ */

function endGame() {

    if (gameState !== "playing") {
        return;
    }

    gameState = "gameover";

    saveHighScore();

    overlayTitle.textContent = "Game Over!";

    overlayMessage.textContent =
        `Your final score: ${Math.floor(score)}. ` +
        "Can you survive longer next time?";

    gameOverlay.style.display = "flex";

    startButton.textContent = restartText;

}


/* ============================================
   23. DRAWING THE GAME
   ============================================ */

function drawGround() {

    ctx.fillStyle = "#111a3b";

    ctx.fillRect(
        0,
        GROUND_Y,
        WIDTH,
        HEIGHT - GROUND_Y
    );

    ctx.fillStyle = "#22d3ee";

    ctx.fillRect(
        0,
        GROUND_Y,
        WIDTH,
        3
    );

    // Ground movement details.

    ctx.fillStyle = "#475569";

    const offset = backgroundScroll % 70;

    for (let x = -offset; x < WIDTH; x += 70) {

        ctx.fillRect(
            x,
            GROUND_Y + 22,
            35,
            3
        );

    }

}


function renderGame() {

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Layer 1: Background.

    drawBackground();

    // Layer 2: Decorative elements.

    drawDoodads();

    // Layer 3: Ground.

    drawGround();

    // Layer 4: Obstacles.

    drawObstacles();

    // Layer 5: Runner.

    drawRunner();

    // Layer 6: Debug hitboxes.

    drawHitboxes();

}


/* ============================================
   24. GAME UPDATE
   ============================================ */

function updateGame(dt) {

    if (gameState !== "playing") {
        return;
    }

    elapsedTime += dt;

    backgroundScroll +=
        gameSpeed * CONFIG.background.scrollSpeed * dt;

    updateRunner(dt);

    updateObstacles(dt);

    updateDoodads(dt);

    updateScore(dt);

    checkObstacleCollisions();

}


/* ============================================
   25. MAIN ANIMATION LOOP
   ============================================ */

function gameLoop(currentTime) {

    if (!previousTime) {
        previousTime = currentTime;
    }

    // Delta time in seconds.
    // Limit large time jumps when the browser is inactive.

    const dt = Math.min(
        (currentTime - previousTime) / 1000,
        0.05
    );

    previousTime = currentTime;

    updateGame(dt);

    renderGame();

    animationFrameId = requestAnimationFrame(gameLoop);

}


/* ============================================
   26. USER INPUT
   ============================================ */

// Keyboard controls.

document.addEventListener("keydown", event => {

    if (
        event.code === "Space" ||
        event.code === "ArrowUp"
    ) {

        event.preventDefault();

        if (!event.repeat) {
            jump();
        }

    }

});


// Mouse and touchscreen controls.

canvas.addEventListener("pointerdown", event => {

    event.preventDefault();

    jump();

});


// Start and restart button.

startButton.addEventListener("click", () => {

    startGame();

});


// Prevent accidental page scrolling during gameplay
// when tapping the Canvas on mobile devices.

canvas.style.touchAction = "none";


/* ============================================
   27. INITIALIZATION
   ============================================ */

function initializeGame() {

    // Display initial high score.

    highScoreDisplay.textContent = Math.floor(highScore);

    scoreDisplay.textContent = "0";

    // Prepare decorative elements.

    initializeDoodads();

    // Load optional PNG assets.

    loadImages();

    // Initial overlay state.

    gameState = "ready";

    gameOverlay.style.display = "flex";

    overlayTitle.textContent = "Space Runner";

    overlayMessage.textContent =
        "Ready for an endless space adventure?";

    startButton.textContent = startText;

    // Start exactly one animation loop.

    if (animationFrameId === null) {

        previousTime = 0;

        animationFrameId = requestAnimationFrame(gameLoop);

    }

}


// Initialize the game.

initializeGame();
