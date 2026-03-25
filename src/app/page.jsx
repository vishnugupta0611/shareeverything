"use client";
import Link from "next/link";
import { useTheme } from "../contexts/ThemeContext";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Refs for animations
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const shareNowRef = useRef(null);
  const shareButtonsRef = useRef(null);
  const phoneRef = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Global GSAP defaults for consistent smooth motion
    gsap.defaults({ duration: 0.85, ease: "power2.out", overwrite: "auto" });

    // Enable hardware acceleration hints and round pixel transforms
    gsap.config({ nullTargetWarn: false });

    // Amazing hero text animations
    const tl = gsap.timeline({ delay: 0.5 });

    // Animate each word with spectacular effects
    const words = titleRef.current?.querySelectorAll('.hero-word') || [];

    // Initial setup - hide all words
    if (words.length > 0) {
      gsap.set(words, {
        y: 100,
        opacity: 0,
        rotationX: 90,
        transformOrigin: "50% 50% -50px"
      });

      // Animate words one by one with amazing effects
      words.forEach((word, index) => {
        tl.to(word, {
          y: 0,
          opacity: 1,
          rotationX: 0,
          duration: 0.8,
          ease: "back.out(1.7)",
          onComplete: () => {
            // Add glow effect to important words
            if (word.classList.contains('glow-word')) {
              gsap.to(word, {
                textShadow: "0 0 20px #84cc16, 0 0 40px #84cc16, 0 0 60px #84cc16",
                duration: 0.5,
                yoyo: true,
                repeat: 1
              });
            }
          }
        }, index * 0.15);
      });
    }

    // Animate subtitle with typewriter effect
    if (subtitleRef.current) {
      tl.fromTo(subtitleRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out"
        },
        "-=0.5"
      );
    }



    // Smooth scroll-triggered animations for hero elements
    if (titleRef.current && heroRef.current) {
      gsap.to(titleRef.current, {
        y: -50,
        opacity: 0.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.1,
        }
      });
    }

    if (subtitleRef.current && heroRef.current) {
      gsap.to(subtitleRef.current, {
        y: -30,
        opacity: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.1,
        }
      });
    }

    // Gentle, optimized orb animation via GSAP loop (no CSS shader thrash)
    if (heroRef.current) {
      const heroOrbs = heroRef.current.querySelectorAll('.orb');
      if (heroOrbs.length) {
        gsap.to(heroOrbs, {
          scale: 1.1,
          opacity: 0.7,
          duration: 3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.25,
          force3D: true,
        });
      }
    }

    // Animate the "Want to share" section
    const shareHeroTitle = shareNowRef.current.querySelector('h2') || shareNowRef.current.querySelector('h1');
    if (shareHeroTitle) {
      gsap.fromTo(shareHeroTitle,
        { y: 100, opacity: 0, scale: 0.8 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: shareNowRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    // Animate the share buttons
    if (shareButtonsRef.current?.children) {
      gsap.fromTo(shareButtonsRef.current.children,
      { y: 80, opacity: 0, scale: 0.8 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "elastic.out(1, 0.5)",
        scrollTrigger: {
          trigger: shareNowRef.current,
          start: "top 70%",
          end: "bottom 30%",
          toggleActions: "play none none reverse"
        }
      }
      );
    }

    // Scroll-triggered animations
    if (section2Ref.current) {
      gsap.fromTo(section2Ref.current,
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section2Ref.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    if (phoneRef.current && section3Ref.current) {
      gsap.fromTo(phoneRef.current,
        { x: -100, opacity: 0, rotation: -5 },
        {
          x: 0,
          opacity: 1,
          rotation: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section3Ref.current,
            start: "top 70%",
            end: "bottom 30%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    if (section4Ref.current) {
      gsap.fromTo(section4Ref.current.children,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section4Ref.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className={`${isDark ? 'bg-black' : 'bg-white'} text-white overflow-x-hidden m-0`}>

    

      {/* New Section - Want to Share (Redesign) */}
      <section ref={shareNowRef} className="min-h-screen flex flex-col justify-between items-center px-6 py-16 bg-black mt-0">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 gap-10 items-center">
          <div className="space-y-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-400">Let’s send anything</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-white">
              Secure file sharing<br />that just works.
            </h1>
            <p className="text-gray-300 text-lg sm:text-xl leading-relaxed">
              No signup. No storage. No waiting. Launch a session and share directly with the other browser in a few seconds.
            </p>

            <div ref={shareButtonsRef} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/create" className="px-7 py-4 bg-lime-400 text-black rounded-full font-bold text-base sm:text-lg shadow-lg hover:bg-lime-300 transition">
                Start Sharing
              </Link>
              <Link href="/join" className="px-7 py-4 border border-cyan-500 text-cyan-300 rounded-full font-bold text-base sm:text-lg hover:bg-cyan-500/15 transition">
                Start Receiving
              </Link>
              <button onClick={() => console.log('Instant share clicked')} className="px-7 py-4 bg-gray-800 text-white rounded-full font-bold text-base sm:text-lg border border-gray-700 hover:bg-gray-700 transition">
                Instant Share
              </button>
            </div>

            {/* <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-gray-400">
              <span className="bg-white/10 rounded-full px-3 py-1">✓ Real-time</span>
              <span className="bg-white/10 rounded-full px-3 py-1">✓ P2P encrypted</span>
              <span className="bg-white/10 rounded-full px-3 py-1">✓ Zero backend</span>
            </div> */}
          </div>
        </div>
      </section>

        {/* Hero Section */}
    

      {/* Section 2 - Future of Sharing */}
      <section ref={section2Ref} className="min-h-screen flex flex-col justify-center items-center px-6 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-6xl md:text-8xl lg:text-9xl font-black leading-tight mb-8">
            <span className="text-white">Share the future</span>
            <br />
            <span className="text-gray-600">of digital </span>
            <span className="text-white text-5xl md:text-8xl lg:text-9xl">connectivity.</span>
          </h2>

          {/* <div className="flex flex-wrap justify-center gap-4 mt-12">
            <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30 backdrop-blur-md">
              <span className="text-green-400 text-sm">✅ Features</span>
            </div>
            <div className="px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30 backdrop-blur-md">
              <span className="text-orange-400 text-sm">🔥 Instant file booking</span>
            </div>
          </div> */}
        </div>
      </section>

      {/* Section 3 - Phone Demo */}


      {/* Section 4 - Features */}
      <section ref={section4Ref} className="min-h-[50vh] flex flex-col justify-center px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          {/* <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8">
              Smarter sharing
              <br />
              starts here.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl">
              Our file-share app makes every transfer smooth, safe, and affordable.
              Whether commuting to work, meeting friends, or catching a flight —
              book your share in seconds.
            </p>
          </div> */}

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Instant Sharing</h4>
              <p className="text-gray-400">
                Our file-share app makes every transfer smooth, safe, and affordable.
                Whether commuting to work, meeting friends, or catching a flight —
                book your share in seconds.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Live Tracking</h4>
              <p className="text-gray-400">
                Track your file's location in real-time and share your transfer
                details with friends & family for extra safety, real-time and
                share your trip.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Safe & Affordable</h4>
              <p className="text-gray-400">
                Verified senders, cashless payments, and transparent fares —
                giving you peace of mind on every ride, cashless payments, and
                transparent fares.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 bg-black border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Ready to experience the future of file sharing?
          </h3>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/create"
              className="px-8 py-4 bg-lime-400 text-black rounded-full font-bold text-lg hover:bg-lime-300 transition-all duration-300 hover:scale-105"
            >
              Start Sharing Now
            </Link>
            <Link
              href="/join"
              className="px-8 py-4 bg-gray-800 text-white rounded-full font-bold text-lg border border-gray-600 hover:bg-gray-700 transition-all duration-300 hover:scale-105"
            >
              Join a Session
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}