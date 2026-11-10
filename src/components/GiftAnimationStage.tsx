import React from 'react';
import { getGiftAnimationProfile } from '../utils/giftAnimationProfile';

export interface GiftAnimationStageProps {
  giftId: string;
  giftImage: string;
  giftName: string;
  animation: 'sparkle' | 'reveal' | 'cinematic' | 'legendary';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  reducedMotion?: boolean;
  size?: 'preview' | 'live';
}

/**
 * Shared GIFTVERSE animation composition. The artwork remains the source of truth;
 * category choreography, atmospheric layers and rarity treatment are composed around it.
 */
export default function GiftAnimationStage({
  giftId, category, giftImage, giftName, animation, rarity, reducedMotion = false, size = 'live',
}: GiftAnimationStageProps) {
  const profile = getGiftAnimationProfile(giftId, animation, category);\n  const giftHue = Array.from(giftId).reduce((value, character) => (value * 31 + character.charCodeAt(0)) % 360, 0);
  return (
    <div
      className={['gift-stage', `gift-stage--${profile.category}`, `gift-stage--${animation}`, `gift-stage--${size}`].join(' ')}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-rarity={rarity}\n      style={{ '--gift-hue': giftHue } as React.CSSProperties}
      role="img"
      aria-label={giftName}
    >
      <div className="gift-stage__backlight" aria-hidden="true" />
      <div className="gift-stage__orbit gift-stage__orbit--one" aria-hidden="true" />
      <div className="gift-stage__orbit gift-stage__orbit--two" aria-hidden="true" />
      <div className="gift-stage__particles" aria-hidden="true">
        {Array.from({ length: profile.particleCount }, (_, index) => (
          <i key={index} style={{ '--particle-index': index } as React.CSSProperties} />
        ))}
      </div>
      {profile.category === 'floral' && <div className="gift-stage__petals" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>}
      {profile.category === 'dragon' && <div className="gift-stage__flight-trail" aria-hidden="true" />}
      {profile.category === 'wildlife' && <div className="gift-stage__ground-glow" aria-hidden="true" />}
      <img className="gift-stage__art" src={giftImage} alt="" draggable={false} decoding="async" />
      {animation === 'legendary' && <div className="gift-stage__legendary-flare" aria-hidden="true" />}
      <style>{STAGE_STYLES}</style>
    </div>
  );
}

const STAGE_STYLES = `
.gift-stage{--gift-duration:4.2s;--gift-glow:rgba(139,92,246,.38);position:relative;isolation:isolate;display:grid;place-items:center;overflow:hidden;aspect-ratio:1;width:100%;min-width:0;border-radius:24px;background:radial-gradient(ellipse at 50% 58%,rgba(109,65,220,.13),transparent 66%)}
.gift-stage--live{width:min(72vw,330px);max-height:330px;margin-inline:auto;background:radial-gradient(ellipse at 50% 62%,rgba(109,65,220,.22),transparent 68%)}
.gift-stage--preview{max-width:230px;margin-inline:auto}
.gift-stage--epic,.gift-stage--legendary{--gift-glow:rgba(245,190,95,.48)}
.gift-stage__backlight{position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle,var(--gift-glow),transparent 70%);filter:blur(12px);animation:gift-stage-breathe 3.2s ease-in-out infinite}
.gift-stage__art{position:relative;z-index:4;width:76%;height:76%;padding:7%;box-sizing:border-box;object-fit:contain;border-radius:24%;border:1px solid hsla(var(--gift-hue),78%,72%,.32);background:radial-gradient(circle at 50% 38%,hsla(var(--gift-hue),78%,42%,.34),transparent 70%),linear-gradient(145deg,#1b1238,#08091b);box-shadow:inset 0 0 25px rgba(255,255,255,.05),0 14px 22px rgba(5,3,20,.45);transform-origin:50% 60%;animation:gift-stage-arrive var(--gift-duration) cubic-bezier(.2,.75,.25,1) both}
.gift-stage--sparkle{--gift-duration:3.4s}
.gift-stage--reveal{--gift-duration:4s}
.gift-stage--cinematic{--gift-duration:5s}
.gift-stage--legendary{--gift-duration:6.4s}
.gift-stage--dragon .gift-stage__art{animation-name:gift-dragon-flight}
.gift-stage--wildlife .gift-stage__art{animation-name:gift-wildlife-step}
.gift-stage--floral .gift-stage__art{animation-name:gift-flower-bloom}
.gift-stage--royal .gift-stage__art,.gift-stage--luxury .gift-stage__art{animation-name:gift-royal-descent}
.gift-stage--celestial .gift-stage__art,.gift-stage--tech .gift-stage__art{animation-name:gift-celestial-turn}
.gift-stage--music .gift-stage__art{animation-name:gift-music-pulse}\n.gift-stage--culinary .gift-stage__art{animation-name:gift-flower-bloom}\n.gift-stage--journeys .gift-stage__art{animation-name:gift-dragon-flight}\n.gift-stage--celebrations .gift-stage__art{animation-name:gift-music-pulse}\n.gift-stage--relics .gift-stage__art{animation-name:gift-royal-descent}\n.gift-stage--sigils .gift-stage__art{animation-name:gift-celestial-turn}\n.gift-stage--bonds .gift-stage__art{animation-name:gift-heart-pulse}
.gift-stage__orbit{position:absolute;z-index:2;width:82%;height:34%;border:1px solid rgba(201,180,255,.2);border-radius:50%;transform:rotate(-28deg);opacity:0;animation:gift-orbit-in 4s ease-out both}
.gift-stage__orbit--two{width:68%;height:25%;transform:rotate(34deg);animation-delay:.18s;border-color:rgba(255,220,160,.18)}
.gift-stage__particles{position:absolute;inset:5%;z-index:5;pointer-events:none}
.gift-stage__particles i{position:absolute;left:calc(12% + (var(--particle-index) * 6.3%));top:calc(18% + ((var(--particle-index) % 4) * 17%));width:4px;height:4px;border-radius:50%;background:#e8d9ff;box-shadow:0 0 12px 3px rgba(177,137,255,.65);opacity:0;animation:gift-particle-rise 2.8s ease-out infinite;animation-delay:calc(var(--particle-index) * -0.19s)}
.gift-stage--legendary .gift-stage__particles i{width:6px;height:6px;background:#ffe7a8;box-shadow:0 0 18px 5px rgba(255,199,104,.6)}
.gift-stage__petals{position:absolute;z-index:3;width:82%;height:82%;animation:gift-petal-turn 7s linear infinite}
.gift-stage__petals i{position:absolute;left:48%;top:5%;width:13%;height:23%;border-radius:100% 0 100% 0;background:linear-gradient(145deg,rgba(255,190,225,.82),rgba(145,75,210,.08));filter:blur(.2px);transform-origin:50% 190%;opacity:0;animation:gift-petal-open 2.2s ease-out both}
.gift-stage__petals i:nth-child(2){transform:rotate(60deg);animation-delay:.08s}.gift-stage__petals i:nth-child(3){transform:rotate(120deg);animation-delay:.16s}.gift-stage__petals i:nth-child(4){transform:rotate(180deg);animation-delay:.24s}.gift-stage__petals i:nth-child(5){transform:rotate(240deg);animation-delay:.32s}.gift-stage__petals i:nth-child(6){transform:rotate(300deg);animation-delay:.4s}
.gift-stage__flight-trail{position:absolute;z-index:1;width:100%;height:28%;left:-110%;top:48%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(160,120,255,.4),rgba(255,180,120,.18),transparent);filter:blur(12px);transform:rotate(-18deg);animation:gift-flight-trail 5s ease-in-out both}
.gift-stage__ground-glow{position:absolute;z-index:2;bottom:16%;width:58%;height:9%;border-radius:50%;background:rgba(250,198,113,.28);filter:blur(14px);animation:gift-ground-pulse 1.2s ease-in-out infinite}
.gift-stage__legendary-flare{position:absolute;z-index:6;inset:8%;border:1px solid rgba(255,220,160,.45);border-radius:50%;box-shadow:0 0 42px rgba(245,190,95,.22),inset 0 0 30px rgba(245,190,95,.12);animation:gift-flare 2.6s ease-in-out infinite}
@keyframes gift-heart-pulse{0%,100%{transform:scale(1)}25%{transform:scale(1.08)}45%{transform:scale(.98)}65%{transform:scale(1.045)}80%{transform:scale(1)}}\n@keyframes gift-stage-arrive{0%{opacity:0;transform:translateY(44px) scale(.5)}65%{opacity:1;transform:translateY(-8px) scale(1.08)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes gift-dragon-flight{0%{opacity:0;transform:translate(-110px,48px) rotate(-18deg) scale(.48)}35%{opacity:1;transform:translate(-8px,-18px) rotate(7deg) scale(1.12)}68%{transform:translate(58px,-4px) rotate(-5deg) scale(1.02)}100%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}}
@keyframes gift-wildlife-step{0%{opacity:0;transform:translateX(-78px) translateY(18px) scale(.76)}18%{opacity:1}32%{transform:translateX(-34px) translateY(-7px) rotate(-3deg) scale(.94)}48%{transform:translateX(4px) translateY(2px) rotate(2deg) scale(1.02)}64%{transform:translateX(34px) translateY(-6px) rotate(-2deg) scale(1.03)}82%{transform:translateX(8px) translateY(0) scale(1)}100%{opacity:1;transform:translateX(0) translateY(0) scale(1)}}
@keyframes gift-flower-bloom{0%{opacity:0;transform:scale(.08) rotate(-38deg)}45%{opacity:1;transform:scale(1.12) rotate(8deg)}70%{transform:scale(.96) rotate(-3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes gift-royal-descent{0%{opacity:0;transform:translateY(-100px) rotate(-18deg) scale(.5)}55%{opacity:1;transform:translateY(8px) rotate(5deg) scale(1.1)}78%{transform:translateY(-4px) rotate(-2deg) scale(1)}100%{transform:translateY(0) rotate(0) scale(1)}}
@keyframes gift-celestial-turn{0%{opacity:0;transform:rotate(-75deg) scale(.45)}55%{opacity:1;transform:rotate(18deg) scale(1.12)}100%{opacity:1;transform:rotate(0) scale(1)}}
@keyframes gift-music-pulse{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(-12px) scale(1.04)}50%{transform:translateY(0) scale(.98)}75%{transform:translateY(-6px) scale(1.02)}}
@keyframes gift-stage-breathe{0%,100%{transform:scale(.82);opacity:.45}50%{transform:scale(1.12);opacity:1}}
@keyframes gift-orbit-in{0%{opacity:0;transform:scale(.35) rotate(-28deg)}45%{opacity:.9}100%{opacity:.35;transform:scale(1) rotate(-28deg)}}
@keyframes gift-particle-rise{0%{opacity:0;transform:translate3d(0,20px,0) scale(.4)}25%{opacity:.95}100%{opacity:0;transform:translate3d(12px,-55px,0) scale(1.3)}}
@keyframes gift-petal-turn{to{transform:rotate(360deg)}}
@keyframes gift-petal-open{0%{opacity:0;transform:scale(.05) rotate(0)}65%{opacity:.85}100%{opacity:.38;transform:scale(1) rotate(0)}}
@keyframes gift-flight-trail{0%{left:-110%;opacity:0}25%{opacity:1}80%{opacity:.5}100%{left:110%;opacity:0}}
@keyframes gift-ground-pulse{0%,100%{transform:scaleX(.75);opacity:.35}50%{transform:scaleX(1.15);opacity:.8}}
@keyframes gift-flare{0%,100%{opacity:.25;transform:scale(.9) rotate(0)}50%{opacity:.9;transform:scale(1.08) rotate(18deg)}}
.gift-stage[data-reduced-motion="true"] *{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.gift-stage *{animation:none!important;transition:none!important}}
`;
