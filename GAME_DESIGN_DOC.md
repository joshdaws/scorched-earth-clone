# Scorched Earth: Neon Apocalypse
## Game Design Document

### Core Vision
"What if Jack Burton had to save the world using only a tank and an arsenal of increasingly ridiculous weapons?"

A retro-synthwave artillery game with 80s action movie humor, where every shot comes with a one-liner and every explosion looks like it belongs in a John Carpenter film.

### Visual Identity
- **Color Palette**: Hot pink (#ff00ff), electric cyan (#00ffff), laser yellow (#ffff00), deep purple (#1a0033)
- **Effects**: Scanlines, CRT glow, neon trails, chrome reflections
- **UI**: VHS tracking effects, retro-futuristic HUD, arcade cabinet aesthetic
- **Tanks**: Look like they rolled out of an 80s toy commercial

### Tone & Humor
- **One-liners**: "Looks like someone brought a tank to a tank fight!"
- **Death quips**: "He's not coming back... for a sequel"
- **Shop keeper**: Mysterious weapons dealer with Big Trouble vibes
- **Achievement names**: "Maximum Overdrive", "Escape from Tank York"

### Monetization Model
1. **Free Version**: 
   - Full game access
   - Banner ads between rounds
   - Rewarded video ads for bonus cash
   - "Watch ad to continue" after game over

2. **Premium Version ($2.99)**:
   - No ads
   - Start with bonus cash
   - Exclusive "Golden Tank" skin
   - "Director's Commentary" mode with developer notes

### Progression System
- **XP System**: Gain XP for kills, accuracy, style points
- **Weapon Unlocks**: Start with 5 basic weapons, unlock 30+ through play
- **Tank Customization**: Unlock colors, patterns, accessories
- **Achievements**: 50+ achievements with 80s movie references

### New Features for Mobile

#### 1. Campaign Mode: "Escape from Neon City"
- 50 hand-crafted levels
- Boss fights against mega-tanks
- Story told through VHS-style cutscenes
- Each world has unique terrain themes

#### 2. Daily Challenges
- "Demolition Tuesday": Destroy X tanks
- "Precision Thursday": Hit targets with 90% accuracy
- "Synthwave Sunday": Play with retro filter maxed

#### 3. Weapon Categories
**Starter Arsenal** (Available immediately):
- Baby Missile
- Small Nuke
- Dirt Bomb
- Tracer
- Smoke Bomb

**The Classics** (Unlock at Level 5):
- MegaNuke
- Death's Head
- Napalm
- Acid Rain

**The Ridiculous** (Unlock at Level 20):
- Disco Ball (fragments into dancing lasers)
- Synthesizer (sonic destruction)
- Time Bomb (rewinds the terrain)
- Lightning Guitar (chain lightning)

**The Legendary** (Unlock at Level 50):
- Burton's Big Trouble (creates earthquakes)
- The MacReady (freezes everything)
- Carpenter's Revenge (fog of death)

### Technical Implementation

#### Phase 1: Core Mobile Features (Week 1-2)
- [ ] Set up Capacitor project
- [ ] Implement save system (localStorage → native storage)
- [ ] Add proper pause menu
- [ ] Optimize touch controls
- [ ] Create app icons and splash screens

#### Phase 2: Progression System (Week 3-4)
- [ ] XP and level system
- [ ] Weapon unlock tree
- [ ] Achievement system
- [ ] Player statistics tracking

#### Phase 3: Monetization (Week 5-6)
- [ ] Integrate AdMob for ads
- [ ] Implement in-app purchase for premium
- [ ] Add reward video system
- [ ] Create shop for cosmetics

#### Phase 4: Polish & Content (Week 7-8)
- [ ] 80s one-liners system
- [ ] Synthwave visual effects
- [ ] Campaign levels
- [ ] Sound effects and music

### Mobile-Specific Optimizations
- **Auto-save**: Every turn
- **Battery Saver Mode**: Reduced effects
- **Offline Play**: Full game works without internet
- **Cloud Save**: Sync between devices (later)

### Marketing Hooks
- "The only game where 'I'll be back' is a threat AND a promise"
- "More neon than Miami, more explosions than Die Hard"
- "What would Jack Burton do? Probably fire a disco ball at it"

### Easter Eggs
- Konami code unlocks "Director's Cut" mode
- Hidden "Snake Plissken" tank skin
- Secret "They Live" sunglasses mode
- "The Thing" weapon that makes tanks paranoid

Ready to start building? I suggest we begin with the progression system since that's the core of making the shop meaningful and fun!