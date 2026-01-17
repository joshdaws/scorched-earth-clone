# Native App vs Web-First Architecture Analysis

**Date:** January 2026
**Context:** Evaluating whether our current Capacitor + web stack is the right choice for shipping a polished, Angry Birds-quality mobile game to the App Store.

---

## Executive Summary

**Recommendation: Switch to Unity**

Our current web-first approach (Canvas 2D + Capacitor) can technically deliver a working game, but it's swimming upstream for App Store polish. The premium mobile game market is dominated by Unity and native engines for good reason—they offer tighter integration with platform features, predictable performance, and established tooling.

For a 2D artillery game targeting the polish level of Angry Birds or Crossy Road, Unity provides the optimal balance of development speed, platform features, and proven results. Godot is a viable alternative if open-source philosophy is a priority.

---

## Research Questions Answered

### 1. Performance Ceiling

**Can Capacitor achieve 60fps with particle effects, terrain destruction, and smooth animations?**

**Answer: Yes, but with caveats.**

- Modern WKWebView on iOS is performant, and 60fps is achievable for 2D Canvas games
- However, Capacitor apps run in a WebView which adds overhead compared to native rendering
- Android WebView performance is more variable—the WebView often gets less CPU/GPU allocation than Chrome
- Key limitations:
  - CSS-heavy effects and complex layouts can drop frames
  - Memory management is critical—iOS will kill web content that uses too much memory
  - JavaScript main thread blocking causes visible jank
  - Older devices (iPhone 8-era) will struggle more than with native apps

**Our specific case:** A turn-based artillery game with occasional particle effects and terrain destruction is within Capacitor's capabilities, but we'd be fighting the platform rather than leveraging it.

### 2. Polish Gap

**What separates web-wrapped games from native games?**

| Feature | Web/Capacitor | Native |
|---------|---------------|--------|
| **Haptics** | No standard support (Safari lacks Vibration API) | Full Core Haptics access |
| **Gesture recognition** | Manual implementation | Native gesture recognizers |
| **Memory management** | Limited control; iOS can kill WebView | Fine-grained control |
| **Startup time** | WebView init + JavaScript parsing | Immediate native launch |
| **App size** | Larger (WebView runtime included) | Smaller |
| **Offline reliability** | Service worker complexity | Natural offline support |
| **System integration** | Via plugins (extra dependencies) | Direct API access |
| **Animations** | CSS/JS (can drop frames) | Core Animation (GPU-optimized) |

**The "feel" difference:** Users may not articulate why, but native games feel more responsive. Scroll momentum, touch response, and visual transitions are tuned to platform conventions. WebView apps can approximate this but rarely match it.

### 3. Successful Precedents

**Are there polished, commercially successful mobile games built with web tech + Capacitor?**

**Honest answer: Very few.**

**What I found:**
- Capacitor powers enterprise apps (H&R Block, AAA, Burger King) successfully—but these are utility apps, not games
- HTML5 games like 2048 achieved viral success, but they're hyper-casual and don't require premium polish
- Quento was wrapped via PhoneGap with "mild success"
- The commercial mobile game market is dominated by Unity (51% of Steam games, 60%+ of mobile games)

**Games similar to ours (2D physics-based):**
| Game | Engine | Result |
|------|--------|--------|
| Angry Birds (original) | Box2D + custom C++ | Massive success |
| Angry Birds (remakes) | Unity | Continued success |
| Crossy Road | Unity | $10M+ revenue |
| Monument Valley | Unity | Premium pricing, award-winning |

**Conclusion:** I could not find examples of premium-quality artillery/physics games shipping with web wrappers. The pattern is clear—successful mobile games in this genre use native or Unity.

### 4. Native Alternatives

#### Swift/SpriteKit (iOS-only)

**Pros:**
- Zero dependency on third-party engines
- Tight iOS integration (haptics, gestures, Metal rendering)
- Built-in 2D physics engine
- Free
- Smallest possible app size

**Cons:**
- iOS only—no Android without complete rewrite
- Swift expertise required
- Apple-specific toolchain

**Best for:** iOS-exclusive games where platform integration matters more than cross-platform reach.

#### Unity

**Pros:**
- Industry standard (60%+ of mobile games)
- Massive ecosystem and documentation
- True cross-platform (iOS, Android, web, consoles)
- Built-in physics (Box2D for 2D)
- Asset Store for rapid development
- Free tier for <$100K revenue
- 6-12 month learning curve to proficiency

**Cons:**
- Larger app size than native (~30-50MB overhead)
- C# required (different from our JavaScript)
- Can be overkill for simple games

**Best for:** Any game targeting App Store success with potential for Android/cross-platform.

#### Godot

**Pros:**
- Completely free, open source (MIT license)
- Lightweight builds (~15-30MB)
- Excellent 2D support
- GDScript is Python-like (easy to learn)
- Growing rapidly in indie community
- Single codebase for iOS/Android

**Cons:**
- Smaller ecosystem than Unity
- Fewer tutorials and resources
- Less proven in commercial mobile games
- iOS export requires macOS

**Best for:** Indie developers who value open-source and lightweight tooling.

### 5. Monetization Implications

**Do web-wrapped apps have App Store limitations?**

**No fundamental limitations.** Capacitor apps can use:
- Apple's StoreKit for in-app purchases (via plugins like RevenueCat)
- Standard App Store pricing and subscriptions
- Same monetization options as native apps

**The catch:** You must use native purchase APIs—web payment flows don't satisfy Apple's requirements. This means Capacitor plugins that bridge to native code, adding complexity.

### 6. Development Timeline

**Realistic assessment: Current stack vs. rewrite**

#### Continue with Capacitor

| Phase | Effort |
|-------|--------|
| Core gameplay completion | 2-4 weeks |
| Polish and effects | 2-3 weeks |
| iOS optimization and debugging | 2-4 weeks |
| App Store submission/iteration | 1-2 weeks |
| **Total** | **7-13 weeks** |

**Risk:** iOS-specific issues may require significant debugging. No haptic feedback. Performance may not meet expectations on older devices.

#### Rewrite in Unity

| Phase | Effort |
|-------|--------|
| Unity learning curve | 2-4 weeks (parallel with development) |
| Core gameplay port | 3-5 weeks |
| Polish and effects | 2-3 weeks |
| iOS optimization | 1-2 weeks (Unity handles most of this) |
| App Store submission | 1 week |
| **Total** | **9-15 weeks** |

**Advantage:** The resulting product has a clearer path to polish. Unity's tooling is built for this exact use case.

#### Key Consideration: What transfers?

From our current codebase:
- ✅ Game logic concepts (turn flow, weapon behaviors, AI)
- ✅ Art assets and specifications
- ✅ Audio assets
- ✅ Design decisions and UX patterns
- ❌ JavaScript code (must be rewritten in C#)
- ❌ Canvas rendering code
- ❌ Input handling specifics

**Approximately 60-70% of the work is transferable as design/knowledge, not code.**

---

## Comparison Matrix

| Factor | Capacitor | Swift/SpriteKit | Unity | Godot |
|--------|-----------|-----------------|-------|-------|
| **Performance** | Good (with effort) | Excellent | Excellent | Very Good |
| **iOS Integration** | Plugin-dependent | Native | Good | Good |
| **Android Support** | Yes | No | Yes | Yes |
| **Learning Curve** | Low (we know JS) | Medium | Medium | Low-Medium |
| **Ecosystem/Resources** | Limited for games | Apple docs | Massive | Growing |
| **App Size** | ~20-40MB | ~10-20MB | ~50-80MB | ~15-30MB |
| **Haptics** | No standard API | Full support | Full support | Via plugins |
| **Proven for Games** | Minimal | Yes (iOS) | Dominant | Increasing |
| **Migration Effort** | N/A (current) | High (iOS only) | Medium | Medium |
| **Recommendation** | ⚠️ | ⚠️ (iOS lock-in) | ✅ | ✅ (alternative) |

---

## Recommendation

### Primary: Unity

**Why:**
1. **Proven path:** Angry Birds, Crossy Road, and Monument Valley all use Unity. It's the established choice for polished 2D mobile games.
2. **Cross-platform:** One codebase for iOS and Android. Even if we only target iOS first, Android becomes trivial later.
3. **Ecosystem:** Need a particle system? Asset Store. Need audio tools? Built-in. Need tutorials? Thousands available.
4. **Performance:** Native rendering means consistent 60fps without fighting WebView limitations.
5. **Platform features:** Full haptics, native gestures, and iOS integration are standard.
6. **Professional credibility:** "Built with Unity" is expected for premium games. "Built with Capacitor" raises questions.

### Alternative: Godot

**Consider if:**
- Open-source philosophy is important
- We want the lightest possible app size
- We're comfortable with a smaller community

Godot is increasingly capable and has strong 2D support. It's a valid choice, especially post-Unity pricing controversies.

### Not Recommended: Continue with Capacitor

**Why not:**
- We're building a premium product in a technology optimized for utility apps
- Every iOS-specific polish item requires finding/building/debugging plugins
- No haptic feedback without significant workarounds
- Performance optimization is fighting the platform
- Very few successful game precedents to learn from

### Not Recommended: Swift/SpriteKit

**Why not:**
- iOS-only limits future options
- Smaller community for game-specific challenges
- No Android path without complete rewrite

---

## Migration Path (If Switching to Unity)

### Phase 1: Setup (Week 1)
- Install Unity Hub, create project with 2D template
- Import existing art assets
- Learn Unity basics (scenes, GameObjects, MonoBehaviour)

### Phase 2: Core Systems (Weeks 2-4)
- Recreate terrain system (Unity has pixel manipulation via Texture2D)
- Implement projectile physics (use Unity's 2D physics or custom)
- Build tank entity with aiming controls
- Port weapon definitions (C# classes instead of JS modules)

### Phase 3: Game Flow (Weeks 4-6)
- Turn state machine
- AI opponent (logic translates directly)
- Shop/economy system
- UI (Unity's new UI Toolkit or uGUI)

### Phase 4: Polish (Weeks 6-8)
- Particle effects (Unity Particle System)
- Screen shake, flash effects
- Haptic feedback (trivial in Unity)
- Audio (Unity's audio system)

### Phase 5: Ship (Weeks 8-10)
- iOS build configuration
- App Store assets and metadata
- TestFlight beta testing
- Submit to App Store

---

## Conclusion

Our current Capacitor approach is technically viable but strategically suboptimal. The mobile game market has spoken—premium games use native engines, predominantly Unity.

Switching now, before we invest more in the current stack, minimizes wasted effort. Our game design, art direction, and specifications all transfer. Only the implementation code needs rewriting.

**Recommended action:** Pause current implementation, spend 1-2 weeks evaluating Unity with a simple prototype (single weapon, basic terrain), then make final decision.

---

## Sources

### Capacitor Performance
- [Ionic Capacitor Performance Discussion](https://github.com/ionic-team/capacitor/discussions/3899)
- [Capacitor Games Documentation](https://capacitorjs.com/docs/guides/games)
- [Improve Mobile App Performance in Capacitor](https://nextnative.dev/blog/improve-mobile-app-performance)

### Game Engine Comparisons
- [Unity for Monument Valley](https://unity.com/resources/monument-valley-3-blurring-art-and-design)
- [Crossy Road Unity Ads Success](https://gamesbeat.com/crossy-road-earns-3m-in-revenue-from-unitys-video-ads/)
- [Godot Mobile Development Guide](https://generalistprogrammer.com/godot-mobile-development)
- [Best 2D Game Engines 2025](https://polydin.com/best-2d-game-engines/)

### Web Technology Limitations
- [Vibration API Browser Support](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [Safari 17 Features](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- [Rebuilding HTML5 Game in Unity](https://www.smashingmagazine.com/2014/04/rebuilding-an-html5-game-in-unity/)

### Native iOS Development
- [SpriteKit Documentation](https://developer.apple.com/documentation/spritekit/)
- [SpriteKit Physics Best Practices](https://gamedev.net/blogs/entry/2295868-implementing-physics-in-spritekit-best-practices-for-2d-ios-game-development/)

### In-App Purchases
- [Capacitor In-App Purchases Guide](https://capacitorjs.com/docs/guides/in-app-purchases)
- [RevenueCat Capacitor SDK](https://github.com/RevenueCat/purchases-capacitor)
