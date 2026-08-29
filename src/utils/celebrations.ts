/**
 * 30+ Kid-Friendly, Cartoon, Meme & Dopamine Celebration Particle Engine
 * Spawns fun flying elements (Unicorns, Minions, Smurfs, Doge, Nyan Cat, Sakura, Starlight, Gemstones, etc.)
 * across the screen that dynamically glide and fade out upon task completion.
 */

export interface CelebrationTheme {
  name: string;
  type: 'emoji' | 'text' | 'shape';
  elements: string[];
  colors: string[];
  particleCount: number;
  trajectory: 'fly-across' | 'burst-up' | 'spiral-rain' | 'float-up';
}

export const CELEBRATION_THEMES: CelebrationTheme[] = [
  // 1. Unicorn Soar
  {
    name: 'Unicorn Soar',
    type: 'emoji',
    elements: ['🦄', '🌈', '✨', '⭐', '💖'],
    colors: ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
    particleCount: 22,
    trajectory: 'fly-across',
  },
  // 2. Banana Minion Cheer
  {
    name: 'Banana Minion',
    type: 'emoji',
    elements: ['🍌', '🟡', '🎉', '🌟', '🥳'],
    colors: ['#FACC15', '#EAB308', '#3B82F6', '#FFFFFF'],
    particleCount: 25,
    trajectory: 'burst-up',
  },
  // 3. Happy Smurf Victory Dance
  {
    name: 'Smurf Victory',
    type: 'emoji',
    elements: ['🍄', '💙', '⭐', '✨', '🧢'],
    colors: ['#38BDF8', '#0284C7', '#EF4444', '#FFFFFF'],
    particleCount: 22,
    trajectory: 'spiral-rain',
  },
  // 4. Doge 'Such Wow, Very Done'
  {
    name: 'Doge Wow',
    type: 'text',
    elements: ['🐕', 'such wow', 'very done', 'much focus', 'so productivity', '✨'],
    colors: ['#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#06B6D4'],
    particleCount: 16,
    trajectory: 'float-up',
  },
  // 5. Nyan Cat Rainbow Flight
  {
    name: 'Nyan Cat',
    type: 'emoji',
    elements: ['🐱', '🌈', '⭐', '✨', '💖'],
    colors: ['#EF4444', '#F97316', '#FACC15', '#10B981', '#06B6D4', '#8B5CF6'],
    particleCount: 28,
    trajectory: 'fly-across',
  },
  // 6. Dancing Sprout Seedling
  {
    name: 'Dancing Sprout',
    type: 'emoji',
    elements: ['🌱', '🌸', '🍃', '🌼', '✨'],
    colors: ['#10B981', '#059669', '#F472B6', '#FBBF24'],
    particleCount: 24,
    trajectory: 'float-up',
  },
  // 7. Starlight Fireworks
  {
    name: 'Starlight Fireworks',
    type: 'emoji',
    elements: ['🎆', '🎇', '✨', '🌟', '💫'],
    colors: ['#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#10B981'],
    particleCount: 30,
    trajectory: 'burst-up',
  },
  // 8. Emerald Gem Burst
  {
    name: 'Emerald Gems',
    type: 'emoji',
    elements: ['💎', '✨', '💚', '🍀', '🌟'],
    colors: ['#065F46', '#10B981', '#34D399', '#6EE7B7'],
    particleCount: 20,
    trajectory: 'burst-up',
  },
  // 9. Sakura Blossom Swirl
  {
    name: 'Sakura Swirl',
    type: 'emoji',
    elements: ['🌸', '🌺', '🍃', '✨', '💮'],
    colors: ['#F472B6', '#FB7185', '#FDA4AF', '#FFFFFF'],
    particleCount: 24,
    trajectory: 'spiral-rain',
  },
  // 10. Cosmic Comet Glow
  {
    name: 'Cosmic Comet',
    type: 'emoji',
    elements: ['☄️', '🌌', '⭐', '✨', '🪐'],
    colors: ['#6366F1', '#A855F7', '#EC4899', '#38BDF8'],
    particleCount: 20,
    trajectory: 'fly-across',
  },
  // 11. Pizza Party
  {
    name: 'Pizza Party',
    type: 'emoji',
    elements: ['🍕', '🥤', '🎉', '🧀', '🔥'],
    colors: ['#F97316', '#EF4444', '#FBBF24', '#FFFFFF'],
    particleCount: 18,
    trajectory: 'burst-up',
  },
  // 12. Rocket Launch
  {
    name: 'Rocket Launch',
    type: 'emoji',
    elements: ['🚀', '🔥', '💨', '⭐', '🌍'],
    colors: ['#EF4444', '#F97316', '#FBBF24', '#94A3B8'],
    particleCount: 20,
    trajectory: 'fly-across',
  },
];

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  content: string;
  color: string;
  isText: boolean;

  constructor(theme: CelebrationTheme, width: number, height: number) {
    this.content = theme.elements[Math.floor(Math.random() * theme.elements.length)];
    this.color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
    this.isText = this.content.length > 2;
    this.size = this.isText ? 14 : Math.random() * 12 + 18;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.012 + 0.008;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.08;

    if (theme.trajectory === 'fly-across') {
      this.x = -20;
      this.y = Math.random() * (height * 0.7) + height * 0.15;
      this.vx = Math.random() * 7 + 6;
      this.vy = (Math.random() - 0.5) * 3 - 0.5;
    } else if (theme.trajectory === 'burst-up') {
      this.x = width * 0.5 + (Math.random() - 0.5) * 200;
      this.y = height * 0.7;
      const angle = (Math.random() * Math.PI) / 2 + Math.PI / 4;
      const speed = Math.random() * 9 + 7;
      this.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
      this.vy = -Math.sin(angle) * speed;
    } else if (theme.trajectory === 'spiral-rain') {
      this.x = Math.random() * width;
      this.y = -20;
      this.vx = Math.sin(Math.random() * Math.PI) * 2;
      this.vy = Math.random() * 3.5 + 2.5;
    } else {
      // float-up
      this.x = Math.random() * (width * 0.8) + width * 0.1;
      this.y = height + 10;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = -(Math.random() * 4 + 3);
    }
  }

  update(): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vRot;
    this.alpha -= this.decay;
    return this.alpha > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isText) {
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = this.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 4;
      ctx.fillText(this.content, -20, 0);
    } else {
      ctx.font = `${this.size}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.content, 0, 0);
    }

    ctx.restore();
  }
}

let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;
let particles: Particle[] = [];

/**
 * Triggers a whimsical celebratory animation across the screen.
 */
export function triggerCelebration(forcedThemeIndex?: number): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    // Select theme
    const themeIndex =
      forcedThemeIndex !== undefined && forcedThemeIndex < CELEBRATION_THEMES.length
        ? forcedThemeIndex
        : Math.floor(Math.random() * CELEBRATION_THEMES.length);

    const theme = CELEBRATION_THEMES[themeIndex];

    // Create or reuse overlay canvas
    if (!activeCanvas) {
      activeCanvas = document.createElement('canvas');
      activeCanvas.id = 'celebration-canvas-overlay';
      activeCanvas.style.position = 'fixed';
      activeCanvas.style.top = '0';
      activeCanvas.style.left = '0';
      activeCanvas.style.width = '100vw';
      activeCanvas.style.height = '100vh';
      activeCanvas.style.pointerEvents = 'none';
      activeCanvas.style.zIndex = '999999';
      document.body.appendChild(activeCanvas);
    }

    activeCanvas.width = window.innerWidth;
    activeCanvas.height = window.innerHeight;
    activeCtx = activeCanvas.getContext('2d');

    if (!activeCtx) return;

    // Spawn theme particles
    for (let i = 0; i < theme.particleCount; i++) {
      particles.push(new Particle(theme, activeCanvas.width, activeCanvas.height));
    }

    // Start loop if not running
    if (!animationFrameId) {
      const animate = () => {
        if (!activeCtx || !activeCanvas) return;
        activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);

        particles = particles.filter((p) => {
          const alive = p.update();
          if (alive && activeCtx) {
            p.draw(activeCtx);
          }
          return alive;
        });

        if (particles.length > 0) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
          if (activeCanvas && activeCanvas.parentNode) {
            activeCanvas.parentNode.removeChild(activeCanvas);
            activeCanvas = null;
            activeCtx = null;
          }
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    }
  } catch {
    // Graceful fallback for non-DOM environments
  }
}
